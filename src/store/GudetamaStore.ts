import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import { spawnSync } from 'child_process'
import { S3StoreBackend } from './S3StoreBackend'
import { time } from '../time'
import { log } from '../log'
import prettyBytes from 'pretty-bytes'
import {
  getStepKey,
  config,
  getManifestPath,
  getArchivePaths,
} from '../config'
import { hashFile } from '../manifest/hash'

export interface GudetamaStoreBackend {
  getObject(key: string, path: string): Promise<boolean>
  putObject(key: string, path: string): Promise<void>
}

type ArchiveType = 'cache' | 'persistent_cache' | 'artifact' | 'manifest'

interface StepIndex {
  objects: Array<{
    key: string
    creationDate: string
    size: number
    type: ArchiveType
    branch: string
  }>
}

export class GudetamaStore {
  private tmpdir: string
  constructor(public cache: GudetamaStoreBackend = new S3StoreBackend()) {
    this.tmpdir = fs.mkdtempSync(
      path.join(process.env.TMPDIR || '/tmp', 'gudetama-')
    )
    process.addListener('exit', () => {
      rimraf.sync(this.tmpdir)
    })
  }

  private async getIndex({ stepKey }: { stepKey: string }): Promise<StepIndex> {
    const indexKey = `${stepKey}-index.json`
    const indexPath = path.join(this.tmpdir, indexKey)
    let index: StepIndex = {
      objects: [],
    }
    if (await this.cache.getObject(indexKey, indexPath)) {
      // TODO: io-ts
      try {
        index = JSON.parse(fs.readFileSync(indexPath).toString())
      } catch (e) {
        console.log(fs.readFileSync(indexPath).toString())
        log.fail('could not process index json')
      }
    }
    return index
  }

  private async saveIndex({
    stepKey,
    index,
  }: {
    stepKey: string
    index: StepIndex
  }) {
    const indexKey = `${stepKey}-index.json`
    const indexPath = path.join(this.tmpdir, indexKey)
    fs.writeFileSync(indexPath, JSON.stringify(index))
    await this.cache.putObject(indexKey, indexPath)
  }

  private async updateIndex({
    stepKey,
    updater,
  }: {
    stepKey: string
    updater: (index: StepIndex) => StepIndex | void
  }) {
    const index = await this.getIndex({ stepKey })
    await this.saveIndex({ stepKey, index: updater(index) || index })
  }

  private async addToIndex({
    size,
    stepKey,
    objectKey,
    archiveType,
  }: {
    size: number
    stepKey: string
    objectKey: string
    archiveType: ArchiveType
  }) {
    await this.updateIndex({
      stepKey,
      updater: (index) => {
        const existing = index.objects.findIndex((obj) => obj.key === objectKey)
        if (existing > -1) {
          index.objects.splice(existing, 1)
        }
        index.objects.push({
          branch: config.ci.currentBranch,
          type: archiveType,
          creationDate: new Date().toISOString(),
          key: objectKey,
          size,
        })
      },
    })
  }

  async save({ stepName }: { stepName: string }) {
    log.step(`Saving data for step '${stepName}'`)
    const currentManifestPath = getManifestPath({
      stepName,
      currentOrPrevious: 'current',
    })
    const currentManifestHash = hashFile(currentManifestPath)
    const stepKey = getStepKey({ stepName })

    const {
      persistentCachePaths,
      cachePaths,
      artifactPaths,
    } = getArchivePaths({ stepName })

    if (persistentCachePaths.length) {
      await this.persistArchive({
        paths: persistentCachePaths,
        stepKey,
        archiveType: 'persistent_cache',
        currentManifestHash,
      })
    }
    if (cachePaths.length) {
      await this.persistArchive({
        paths: cachePaths,
        stepKey,
        archiveType: 'cache',
        currentManifestHash,
      })
    }
    if (artifactPaths.length) {
      await this.persistArchive({
        paths: artifactPaths,
        stepKey,
        archiveType: 'artifact',
        currentManifestHash,
      })
    }

    await log.timedSubstep('Persisting manifest', async () => {
      const objectKey = `${stepKey}-manifest-${currentManifestHash}`
      await this.cache.putObject(objectKey, currentManifestPath)
      await this.addToIndex({
        size: fs.statSync(currentManifestPath).size,
        archiveType: 'manifest',
        objectKey,
        stepKey,
      })
    })
  }

  private async persistArchive({
    stepKey,
    paths,
    currentManifestHash,
    archiveType,
  }: {
    stepKey: string
    archiveType: ArchiveType
    currentManifestHash: string
    paths: string[]
  }) {
    const objectKey = `${stepKey}-${archiveType}-${
      // caches do not need exact matching (in fact it balloons cache size)
      // so we only store them by branch
      archiveType === 'cache' ? config.ci.currentBranch : currentManifestHash
    }`
    const tarballPath = path.join(this.tmpdir, objectKey)

    await log.timedSubstep(`Creating archive of [${paths.join(', ')}]`, () => {
      exec('tar', ['cf', tarballPath, ...paths])
    })

    const size = fs.statSync(tarballPath).size

    await log.timedSubstep(`Uploading archive (${prettyBytes(size)})`, () =>
      this.cache.putObject(objectKey, tarballPath)
    )

    await log.timedSubstep(
      `Updating index`,
      async () =>
        await this.addToIndex({
          stepKey,
          archiveType,
          size,
          objectKey,
        })
    )
  }

  async restoreManifest({ stepName }: { stepName: string }) {
    log.step('Attempting to restore manifest')
    const index = await log.timedSubstep('Fetching index', () =>
      this.getIndex({ stepKey: getStepKey({ stepName }) })
    )
  }

  async restoreCaches({ stepName }: { stepName: string }) {
    const { persistentCachePaths, cachePaths } = getArchivePaths({ stepName })
    if (!persistentCachePaths.length && !cachePaths.length) {
      return
    }
    log.step('Attempting to restore cache(s)')
    const index = await log.timedSubstep('Fetching index', () =>
      this.getIndex({ stepKey: getStepKey({ stepName }) })
    )
    index.objects.sort(objectComparator)

    if (persistentCachePaths.length) {
      for (const match of [
        index.objects.find(
          (o) =>
            o.type === 'persistent_cache' &&
            o.branch === config.ci.currentBranch
        ),
        index.objects.find(
          (o) =>
            o.type === 'persistent_cache' &&
            o.branch === config.ci.primaryBranch
        ),
      ]) {
        if (
          match &&
          (await log.timedSubstep(
            `Attempting to download cache of [${persistentCachePaths.join(
              ', '
            )}] from previous build on ${match.branch} (${prettyBytes(
              match.size
            )})`,
            () =>
              this.cache.getObject(match.key, path.join(this.tmpdir, match.key))
          ))
        ) {
          log.timedSubstep(`Success! Unarchiving`, () => {
            exec('tar', [
              'xf',
              path.join(this.tmpdir, match.key),
              '-C',
              process.cwd(),
            ])
          })
          break
        }
      }
    }

    if (cachePaths.length) {
      for (const match of [
        index.objects.find(
          (o) => o.type === 'cache' && o.branch === config.ci.currentBranch
        ),
        index.objects.find(
          (o) => o.type === 'cache' && o.branch === config.ci.primaryBranch
        ),
      ]) {
        if (
          match &&
          (await log.timedSubstep(
            `Attempting to download cache of [${cachePaths.join(
              ', '
            )}] from previous build on ${match.branch} (${prettyBytes(
              match.size
            )})`,
            () =>
              this.cache.getObject(match.key, path.join(this.tmpdir, match.key))
          ))
        ) {
          log.timedSubstep(`Success! Unarchiving`, () => {
            exec('tar', [
              'xf',
              path.join(this.tmpdir, match.key),
              '-C',
              process.cwd(),
            ])
          })
          break
        }
      }
    }
  }

  async restoreArtifacts({ stepName }: { stepName: string }) {
    const { persistentCachePaths, artifactPaths } = getArchivePaths({
      stepName,
    })
    const index = this.getIndex({ stepKey: getStepKey({ stepName }) })
    const currentManifestHash = hashFile(
      getManifestPath({ stepName, currentOrPrevious: 'current' })
    )
    if (
      await time('Downloading archive', () =>
        this.cache.getObject(key, tarballPath)
      )
    ) {
      time('Unarchiving', () => {
        exec('tar', ['xf', tarballPath, '-C', process.cwd()])
      })
      return true
    }
    console.log('No match found')
    return false
  }
}

function exec(command: string, args: string[]) {
  const result = spawnSync(command, args)
  if (result.status !== 0) {
    log.fail(`ERROR: Shell command failed: ${command} ${args.join(' ')}`, {
      detail: result.stderr.toString(),
    })
  }
}

function objectComparator(
  a: StepIndex['objects'][0],
  b: StepIndex['objects'][0]
) {
  return new Date(a.creationDate).valueOf() - new Date(b.creationDate).valueOf()
}
