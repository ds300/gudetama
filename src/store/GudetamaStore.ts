import fs from 'fs-extra'
import path from 'path'
import rimraf from 'rimraf'
import { spawnSync } from 'child_process'
import { S3StoreBackend } from './S3StoreBackend'
import { time } from '../time'
import { log } from '../log'
import prettyBytes from 'pretty-bytes'
import { getStepKey, config, getManifestPath, getArchivePaths } from '../config'
import { hashFile } from '../manifest/hash'
import chalk from 'chalk'

const INDEX_VERSION = 0

export interface GudetamaStoreBackend {
  getObject(key: string, path: string): Promise<boolean>
  putObject(key: string, path: string): Promise<void>
}

type ObjectType = 'cache' | 'persistent_cache' | 'artifact' | 'manifest'

interface StepIndex {
  version: number
  objects: Array<{
    key: string
    creationDate: string
    size: number
    type: ObjectType
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

  private async getIndex({
    stepName,
  }: {
    stepName: string
  }): Promise<StepIndex> {
    const indexKey = `${getStepKey({ stepName })}-index.json`
    const indexPath = path.join(this.tmpdir, indexKey)
    let index: StepIndex = {
      version: INDEX_VERSION,
      objects: [],
    }
    if (await this.cache.getObject(indexKey, indexPath)) {
      // TODO: io-ts
      try {
        const result = JSON.parse(fs.readFileSync(indexPath).toString())
        if (result.version !== INDEX_VERSION) {
          log.substep('Index version changed, starting from scratch...')
        } else {
          index = result
        }
      } catch (e) {
        log.substep('Could not process index json, starting from scratch...')
      }
    }
    return index
  }

  private async saveIndex({
    stepName,
    index,
  }: {
    stepName: string
    index: StepIndex
  }) {
    const indexKey = `${getStepKey({ stepName })}-index.json`
    const indexPath = path.join(this.tmpdir, indexKey)
    fs.writeFileSync(indexPath, JSON.stringify(index))
    await this.cache.putObject(indexKey, indexPath)
  }

  private async updateIndex({
    stepName,
    updater,
  }: {
    stepName: string
    updater: (index: StepIndex) => StepIndex | void
  }) {
    const index = await this.getIndex({ stepName })
    await this.saveIndex({ stepName, index: updater(index) || index })
  }

  private async addToIndex({
    size,
    stepName,
    objectKey,
    objectType,
  }: {
    size: number
    stepName: string
    objectKey: string
    objectType: ObjectType
  }) {
    await this.updateIndex({
      stepName,
      updater: (index) => {
        const existing = index.objects.findIndex((obj) => obj.key === objectKey)
        if (existing > -1) {
          index.objects.splice(existing, 1)
        }
        index.objects.push({
          branch: config.ci.currentBranch,
          type: objectType,
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

    const {
      persistentCachePaths,
      cachePaths,
      artifactPaths,
    } = getArchivePaths({ stepName })

    if (persistentCachePaths.length) {
      await this.persistArchive({
        paths: persistentCachePaths,
        stepName,
        objectType: 'persistent_cache',
        currentManifestHash,
      })
    }
    if (cachePaths.length) {
      await this.persistArchive({
        paths: cachePaths,
        stepName,
        objectType: 'cache',
        currentManifestHash,
      })
    }
    if (artifactPaths.length) {
      await this.persistArchive({
        paths: artifactPaths,
        stepName,
        objectType: 'artifact',
        currentManifestHash,
      })
    }

    await this.persistObject({
      stepName,
      objectType: 'manifest',
      filePath: currentManifestPath,
      currentManifestHash,
    })
  }

  private getObjectKey({
    stepName,
    objectType,
    currentManifestHash,
  }: {
    stepName: string
    objectType: string
    currentManifestHash: string
  }) {
    return `${getStepKey({ stepName })}-${objectType}-${
      // caches do not need exact matching (in fact it balloons cache size)
      // so we only store them by branch
      objectType === 'cache' ? config.ci.currentBranch : currentManifestHash
    }`
  }

  private async persistObject({
    stepName,
    objectType,
    filePath,
    currentManifestHash,
  }: {
    stepName: string
    objectType: ObjectType
    filePath: string
    currentManifestHash: string
  }) {
    const size = fs.statSync(filePath).size
    const objectKey = this.getObjectKey({
      stepName,
      objectType,
      currentManifestHash,
    })

    await log.timedSubstep(
      `Uploading ${objectType} (${prettyBytes(size)})`,
      () => this.cache.putObject(objectKey, filePath)
    )

    await log.timedSubstep(`Updating index`, async () =>
      this.addToIndex({
        stepName,
        objectType,
        size,
        objectKey,
      })
    )
  }

  private async persistArchive({
    stepName,
    paths,
    currentManifestHash,
    objectType,
  }: {
    stepName: string
    objectType: ObjectType
    currentManifestHash: string
    paths: string[]
  }) {
    const objectKey = this.getObjectKey({
      stepName,
      currentManifestHash,
      objectType,
    })
    const tarballPath = path.join(this.tmpdir, objectKey)

    await log.timedSubstep(`Creating archive of [${paths.join(', ')}]`, () => {
      exec('tar', ['cf', tarballPath, ...paths])
    })

    await this.persistObject({
      stepName,
      objectType,
      filePath: tarballPath,
      currentManifestHash,
    })
  }

  async restoreManifest({ stepName }: { stepName: string }) {
    log.step(`Attempting to restore manifest for step ${stepName}`)
    const currentManifestHash = hashFile(
      getManifestPath({
        stepName,
        currentOrPrevious: 'current',
      })
    )
    const previousManifestPath = getManifestPath({
      stepName,
      currentOrPrevious: 'previous',
    })
    if (!fs.existsSync(path.dirname(previousManifestPath))) {
      fs.mkdirpSync(path.dirname(previousManifestPath))
    }
    const exactMatchObjectKey = this.getObjectKey({
      stepName,
      currentManifestHash,
      objectType: 'manifest',
    })

    if (
      await log.timedSubstep('Looking for exact match', () =>
        this.cache.getObject(exactMatchObjectKey, previousManifestPath)
      )
    ) {
      log.substep(chalk.green('Found exact match!'))
      return
    }

    await log.timedSubstep(
      'No exact match found. Looking for fallbacks',
      async () => {
        const index = await this.getIndex({ stepName })
        index.objects.sort(objectComparator)
        for (const match of [
          index.objects.find(
            (o) => o.type === 'manifest' && o.branch === config.ci.currentBranch
          ),
          index.objects.find(
            (o) => o.type === 'manifest' && o.branch === config.ci.primaryBranch
          ),
        ]) {
          if (
            match &&
            (await this.cache.getObject(match.key, previousManifestPath))
          ) {
            log.substep(
              `Found a manifest from a previous successful build on ${chalk.bold(
                match.branch
              )}`
            )
            break
          }
        }
      }
    )
  }

  async restoreCaches({ stepName }: { stepName: string }) {
    const { persistentCachePaths, cachePaths } = getArchivePaths({ stepName })
    if (!persistentCachePaths.length && !cachePaths.length) {
      return
    }
    log.step('Attempting to restore cache(s)')
    const index = await log.timedSubstep('Fetching index', () =>
      this.getIndex({ stepName })
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
            )}] from previous build on ${chalk.bold(
              match.branch
            )} (${prettyBytes(match.size)})`,
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
            )}] from previous build on ${chalk.bold(
              match.branch
            )} (${prettyBytes(match.size)})`,
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
