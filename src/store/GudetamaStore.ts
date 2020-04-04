import fs from 'fs-extra'
import path from 'path'
import rimraf from 'rimraf'
import { S3StoreBackend } from './S3StoreBackend'
import { log } from '../log'
import prettyBytes from 'pretty-bytes'
import { getStepKey, config, getManifestPath, getArchivePaths } from '../config'
import { hashFile } from '../manifest/hash'
import { exec } from '../exec'
import type { CacheBackend } from '@artsy/gudetama'
import { spawn } from 'child_process'
import glob from 'glob'
import { bold } from 'kleur'

export const INDEX_VERSION = 0

export type ObjectType = 'cache' | 'persistent_cache' | 'artifact' | 'manifest'

export interface StepIndex {
  version: 0
  objects: Array<{
    key: string
    lastAccessedDate: string
    creationDate: string
    size: number
    type: ObjectType
    branch: string
    commit: string
  }>
}

export class GudetamaStore {
  private tmpdir: string
  constructor(public cache: CacheBackend = new S3StoreBackend()) {
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

  updateQueue: Array<(index: StepIndex) => StepIndex | void> = []

  private updateIndex({
    updater,
  }: {
    updater: (index: StepIndex) => StepIndex | void
  }) {
    this.updateQueue.push(updater)
  }

  private async commitIndexUpdates({ stepName }: { stepName: string }) {
    let index = await this.getIndex({ stepName })
    while (this.updateQueue.length) {
      index = this.updateQueue.shift()?.(index) || index
    }
    // TODO: prune index
    await this.saveIndex({ stepName, index })
  }

  private addToIndex({
    size,
    objectKey,
    objectType,
  }: {
    size: number
    objectKey: string
    objectType: ObjectType
  }) {
    this.updateIndex({
      updater: (index) => {
        const existing = index.objects.findIndex((obj) => obj.key === objectKey)
        if (existing > -1) {
          index.objects.splice(existing, 1)
        }
        index.objects.push({
          branch: config.currentBranch,
          type: objectType,
          // time zone doesn't matter too much here,
          // we only use these for sorting and cache pruning
          creationDate: new Date().toISOString(),
          lastAccessedDate: new Date().toISOString(),
          key: objectKey,
          size,
          commit: exec('git', ['rev-parse', 'HEAD']).trim(),
        })
      },
    })
  }

  async save({ stepName }: { stepName: string }) {
    log.step(`Saving data`)
    const currentManifestPath = getManifestPath({ stepName })
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

    await log.timedSubstep('Updating index', () =>
      this.commitIndexUpdates({ stepName })
    )
  }

  private getObjectKey({
    stepName,
    objectType,
    currentManifestHash,
  }: {
    stepName: string
    objectType: ObjectType
    currentManifestHash: string
  }) {
    return `${getStepKey({ stepName })}-${objectType}-${
      // caches do not need exact matching (in fact it balloons cache size)
      // so we only store them by branch
      objectType === 'cache' ? config.currentBranch : currentManifestHash
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

    this.addToIndex({
      objectType,
      size,
      objectKey,
    })
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

    const files = new Set<string>()

    for (const path of paths) {
      for (const match of glob.sync(path)) {
        files.add(match)
      }
    }

    await log.timedSubstep(`Creating archive of [${paths.join(', ')}]`, () => {
      if (files.size < 2000) {
        exec('tar', ['cf', tarballPath, ...files])
        return Promise.resolve()
      } else {
        return new Promise((resolve) => {
          const proc = spawn('tar', ['cf', tarballPath, '-T', '-'])
          let stderr = ''
          proc.stderr.on('data', (buf) => {
            stderr += buf.toString()
          })
          proc.on('error', (error) => {
            log.fail('Could not create tarball', { error, detail: stderr })
          })
          proc.on('exit', (status) => {
            if (status !== 0) {
              log.fail(`Could not create tarball. Status ${status}`, {
                detail: stderr,
              })
            } else {
              resolve()
            }
          })
          for (const path of files) {
            proc.stdin.write(path + '\n')
          }
          proc.stdin.end()
        })
      }
    })

    await this.persistObject({
      stepName,
      objectType,
      filePath: tarballPath,
      currentManifestHash,
    })
  }

  async getObjectUpdatingIndex({
    stepName,
    objectKey,
    destinationPath,
  }: {
    stepName: string
    objectKey: string
    destinationPath: string
  }) {
    if (await this.cache.getObject(objectKey, destinationPath)) {
      this.updateIndex({
        updater: (index) => {
          const match = index.objects.find((o) => o.key === objectKey)
          if (match) {
            match.lastAccessedDate = new Date().toISOString()
          } else {
            // _shrug_ must've been a race condition. This object will be GC'd by
            // the prune script.
          }
        },
      })
      await this.commitIndexUpdates({ stepName })
      return true
    }
    return false
  }

  async restoreManifest({
    stepName,
  }: {
    stepName: string
  }): Promise<
    | {
        type: 'exact'
      }
    | {
        type: 'partial'
        previousManifestPath: string
        previousManifestBranch: string
      }
    | { type: 'none' }
  > {
    const currentManifestHash = hashFile(getManifestPath({ stepName }))
    const previousManifestPath = path.join(
      this.tmpdir,
      getStepKey({ stepName }) + '-previous_manifest'
    )
    if (!fs.existsSync(path.dirname(previousManifestPath))) {
      fs.mkdirpSync(path.dirname(previousManifestPath))
    }
    const exactMatchObjectKey = this.getObjectKey({
      stepName,
      currentManifestHash,
      objectType: 'manifest',
    })

    if (
      await this.getObjectUpdatingIndex({
        objectKey: exactMatchObjectKey,
        destinationPath: previousManifestPath,
        stepName,
      })
    ) {
      return { type: 'exact' }
    }

    const index = await this.getIndex({ stepName })
    index.objects.sort(objectComparator)
    for (const match of [
      index.objects.find(
        (o) => o.type === 'manifest' && o.branch === config.currentBranch
      ),
      index.objects.find(
        (o) => o.type === 'manifest' && o.branch === config.primaryBranch
      ),
    ]) {
      if (
        match &&
        (await this.getObjectUpdatingIndex({
          objectKey: match.key,
          destinationPath: previousManifestPath,
          stepName,
        }))
      ) {
        process.env.GUDETAMA_PREVIOUS_SUCCESS_COMMIT = match.commit
        return {
          type: 'partial',
          previousManifestPath,
          previousManifestBranch: match.branch,
        } as const
      }
    }
    log.step(`Couldn't find any previous builds`)
    return { type: 'none' } as const
  }

  async restoreCaches({ stepName }: { stepName: string }) {
    const { persistentCachePaths, cachePaths } = getArchivePaths({ stepName })
    if (!persistentCachePaths.length && !cachePaths.length) {
      return
    }
    log.step('Attempting to restore cache(s)')
    const index = await this.getIndex({ stepName })
    index.objects.sort(objectComparator)

    if (persistentCachePaths.length) {
      for (const match of [
        index.objects.find(
          (o) =>
            o.type === 'persistent_cache' && o.branch === config.currentBranch
        ),
        index.objects.find(
          (o) =>
            o.type === 'persistent_cache' && o.branch === config.primaryBranch
        ),
      ]) {
        if (
          match &&
          (await log.timedSubstep(
            `Attempting to fetch cache of [${persistentCachePaths.join(
              ', '
            )}] from previous build on ${bold(match.branch)} (${prettyBytes(
              match.size
            )})`,
            () =>
              this.getObjectUpdatingIndex({
                objectKey: match.key,
                destinationPath: path.join(this.tmpdir, match.key),
                stepName,
              })
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
          (o) => o.type === 'cache' && o.branch === config.currentBranch
        ),
        index.objects.find(
          (o) => o.type === 'cache' && o.branch === config.primaryBranch
        ),
      ]) {
        if (
          match &&
          (await log.timedSubstep(
            `Attempting to fetch cache of [${cachePaths.join(
              ', '
            )}] from previous build on ${bold(match.branch)} (${prettyBytes(
              match.size
            )})`,
            () =>
              this.getObjectUpdatingIndex({
                objectKey: match.key,
                destinationPath: path.join(this.tmpdir, match.key),
                stepName,
              })
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

  async restoreArtifacts({ stepName }: { stepName: string }): Promise<boolean> {
    log.step('Restoring artifacts')
    const { persistentCachePaths, artifactPaths } = getArchivePaths({
      stepName,
    })
    const index = await this.getIndex({ stepName })
    const currentManifestHash = hashFile(getManifestPath({ stepName }))
    let success = true
    if (persistentCachePaths.length) {
      const objectKey = this.getObjectKey({
        stepName,
        currentManifestHash,
        objectType: 'persistent_cache',
      })
      const tarballPath = path.join(this.tmpdir, objectKey)
      const match = index.objects.find((o) => (o.key = objectKey))
      const sizeString = match ? ` (${prettyBytes(match.size)})` : ''
      if (
        await log.timedSubstep(
          `Fetching archive of [${persistentCachePaths.join(
            ', '
          )}]${sizeString}`,
          () =>
            this.getObjectUpdatingIndex({
              objectKey,
              destinationPath: tarballPath,
              stepName,
            })
        )
      ) {
        await log.timedSubstep('Unarchiving', () => {
          exec('tar', ['xf', tarballPath, '-C', process.cwd()])
        })
      } else {
        log.substep('Archive not found, perhaps it was pruned.')
        success = false
      }
    }

    if (artifactPaths.length) {
      const objectKey = this.getObjectKey({
        stepName,
        currentManifestHash,
        objectType: 'artifact',
      })
      const tarballPath = path.join(this.tmpdir, objectKey)
      const match = index.objects.find((o) => (o.key = objectKey))
      const sizeString = match ? ` (${prettyBytes(match.size)})` : ''
      if (
        await log.timedSubstep(
          `Fetching archive of [${artifactPaths.join(', ')}]${sizeString}`,
          () =>
            this.getObjectUpdatingIndex({
              objectKey,
              destinationPath: tarballPath,
              stepName,
            })
        )
      ) {
        await log.timedSubstep('Unarchiving', () => {
          exec('tar', ['xf', tarballPath, '-C', process.cwd()])
        })
      } else {
        log.substep('Archive not found, perhaps it was pruned.')
        success = false
      }
    }

    return success
  }
}

function objectComparator(
  a: StepIndex['objects'][0],
  b: StepIndex['objects'][0]
) {
  return new Date(a.creationDate).valueOf() - new Date(b.creationDate).valueOf()
}
