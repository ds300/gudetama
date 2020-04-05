import { log } from '../log'
import { StepIndex } from '../store/GudetamaStore'
import prettyBytes from 'pretty-bytes'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import rimraf from 'rimraf'
import os from 'os'
import { getConfig } from '../config'

const maxObjectLifetime =
  Number(process.env.MAX_OBJECT_LIFETIME_DAYS || '7') * 24 * 60 * 60 * 1000

function isTooOld(obj: ObjectData) {
  return (
    new Date(obj.lastAccessedDate).valueOf() < Date.now() - maxObjectLifetime
  )
}

type ObjectData = StepIndex['objects'][0]

export async function prune() {
  const objectStore = getConfig().getObjectStore()
  if (!objectStore.listAllObjects || !objectStore.deleteObject) {
    log.fail(
      'In order to use the `prune` command your object store must implement both `listAllObjects` and `deleteObject`'
    )
  }
  const tmpdir = join(os.tmpdir(), 'gudetama-prune')
  mkdirSync(tmpdir)

  try {
    const done = log.timedTask('Pruning gudetama cache')

    const allObjects = await log.timedStep('Getting all object keys', () =>
      objectStore.listAllObjects!()
    )

    const liveObjects: ObjectData[] = []
    const deadObjects: ObjectData[] = []

    const indexes = allObjects.filter(({ key }) => key.endsWith('-index.json'))

    await log.timedStep(
      'Pruning indexes and identifying objects to remove',
      async () => {
        for (const { key: indexKey } of indexes) {
          const indexPath = join(tmpdir, 'index.json')
          if (!(await objectStore.getObject(indexKey, indexPath))) {
            continue
          }
          const index = JSON.parse(
            readFileSync(indexPath).toString()
          ) as StepIndex

          // remove object keys that are not in the store
          index.objects = index.objects.filter(({ key }) =>
            allObjects.find((obj) => obj.key === key)
          )
          for (let i = 0; i < index.objects.length; i++) {
            if (isTooOld(index.objects[i])) {
              deadObjects.push(index.objects[i])
            } else {
              liveObjects.push(index.objects[i])
            }
          }
          // remove object keys that are to be deleted
          index.objects = index.objects.filter((obj) => !isTooOld(obj))

          if (index.objects.length === 0) {
            log.substep(`Removing index ${indexKey}`)
            await objectStore.deleteObject!(indexKey)
          } else {
            writeFileSync(indexPath, JSON.stringify(index, null, '  '))
            await objectStore.putObject(indexKey, indexPath)
          }
        }
      }
    )

    const unreferencedObjects = allObjects.filter(
      (obj) =>
        !(
          liveObjects.find((live) => live.key === obj.key) ||
          deadObjects.find((dead) => dead.key === obj.key) ||
          indexes.find((index) => index.key === obj.key)
        )
    )

    log.step(`Found ${unreferencedObjects.length} unreferenced objects`)

    const allDeadObjects = [...deadObjects, ...unreferencedObjects]
    if (allDeadObjects.length > 0) {
      let byesToDelete = 0
      for (const obj of allDeadObjects) {
        byesToDelete += obj.size
      }
      await log.timedStep(
        `Removing ${allDeadObjects.length} old objects (${prettyBytes(
          byesToDelete
        )})`,
        async () => {
          for (const object of allDeadObjects) {
            await objectStore.deleteObject!(object.key)
          }
        }
      )
    } else {
      log.step(`Nothing to delete`)
    }

    done('Finished')
  } catch (error) {
    log.fail('Cache prune failed', { error })
  } finally {
    rimraf.sync(tmpdir)
  }
}
