import { S3 } from 'aws-sdk'
import { log } from '../src/log'
import { StepIndex } from '../src/store/GudetamaStore'
import prettyBytes from 'pretty-bytes'

const maxObjectLifetime =
  Number(process.env.MAX_OBJECT_LIFETIME_DAYS || '7') * 24 * 60 * 60 * 1000

function isTooOld(obj: ObjectData) {
  return (
    new Date(obj.lastAccessedDate).valueOf() < Date.now() - maxObjectLifetime
  )
}

const client = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
})

const Bucket = process.env.AWS_S3_BUCKET!

async function getAllObjects(): Promise<Array<{ key: string; size: number }>> {
  const allObjectKeys: Array<{ key: string; size: number }> = []
  const getObjectKeys = async (ContinuationToken?: string) => {
    const result = await client
      .listObjectsV2({
        Bucket,
        ContinuationToken,
      })
      .promise()
    result.Contents?.forEach(({ Key, Size }) =>
      allObjectKeys.push({ key: Key!, size: Size! })
    )
    if (result.NextContinuationToken) {
      await getObjectKeys(result.NextContinuationToken)
    }
  }
  await getObjectKeys()
  return allObjectKeys
}

type ObjectData = StepIndex['objects'][0]

async function run() {
  try {
    const done = log.timedTask('Pruning gudetama cache')

    const allObjects = await log.timedStep('Getting all object keys', () =>
      getAllObjects()
    )

    const liveObjects: ObjectData[] = []
    const deadObjects: ObjectData[] = []

    const indexes = allObjects.filter(({ key }) => key.endsWith('-index.json'))

    await log.timedStep(
      'Pruning indexes and identifying objects to remove',
      async () => {
        for (const { key: indexKey } of indexes) {
          const result = await client
            .getObject({ Key: indexKey, Bucket })
            .promise()
          const index = JSON.parse(result.Body?.toString() || '{}') as StepIndex

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
            await client.deleteObject({ Bucket, Key: indexKey }).promise()
          } else {
            await client
              .putObject({
                Bucket,
                Key: indexKey,
                Body: JSON.stringify(index, null, '  '),
              })
              .promise()
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
          await client
            .deleteObjects({
              Bucket,
              Delete: {
                Objects: allDeadObjects.map(({ key }) => ({ Key: key })),
              },
            })
            .promise()
        }
      )
    } else {
      log.step(`Nothing to delete`)
    }

    done('Finished')
  } catch (error) {
    log.fail('Cache prune failed', { error })
  }
}

run()
