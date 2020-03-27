import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import { spawnSync } from 'child_process'
import { S3StoreBackend } from './S3StoreBackend'
import { time } from '../time'
import { log } from '../log'
import prettyBytes from 'pretty-bytes'

export interface GudetamaStoreBackend {
  getObject(key: string, path: string): Promise<boolean>
  putObject(key: string, path: string): Promise<void>
}

type ArchiveType = 'cache' | 'persistent_cache' | 'artifact'

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

  private async updateIndex(
    stepKey: string,
    updater: (index: StepIndex) => StepIndex | void
  ) {
    const indexKey = `${stepKey}-index.json`
    const indexPath = path.join(this.tmpdir, indexKey)
    let index: StepIndex = {
      objects: [],
    }
    if (await this.cache.getObject(indexKey, indexPath)) {
      // TODO: io-ts
      index = JSON.parse(fs.readFileSync(indexPath).toString())
    }
    const result = updater(index) || index
    fs.writeFileSync(indexPath, JSON.stringify(result))
    await this.cache.putObject(indexKey, indexPath)
  }

  private async addToIndex({
    size,
    stepKey,
    objectKey,
    currentBranch,
    archiveType,
  }: {
    size: number
    stepKey: string
    objectKey: string
    currentBranch: string
    archiveType: ArchiveType
  }) {
    await this.updateIndex(stepKey, (index) => {
      const existing = index.objects.findIndex((obj) => obj.key === objectKey)
      if (existing > -1) {
        index.objects.splice(existing, 1)
      }
      index.objects.push({
        branch: currentBranch,
        type: archiveType,
        creationDate: new Date().toISOString(),
        key: objectKey,
        size,
      })
    })
  }

  async save({
    stepKey,
    paths,
    currentManifestHash,
    currentBranch,
    archiveType,
  }: {
    stepKey: string
    archiveType: ArchiveType
    currentManifestHash: string
    currentBranch: string
    paths: string[]
  }) {
    const objectKey = `${stepKey}-${archiveType}-${
      // caches do not need exact matching (in fact it balloons cache size)
      // so we only store them by branch
      archiveType === 'cache' ? currentBranch : currentManifestHash
    }`
    const tarballPath = path.join(this.tmpdir, objectKey)

    await log.timedSubstep(`Creating archive of [${paths.join(', ')}]`, () => {
      exec('tar', ['cf', tarballPath, ...paths])
    })

    const size = fs.statSync(tarballPath).size

    await log.timedSubstep(`Uploading archive (${prettyBytes(size)})`, () =>
      this.cache.putObject(stepKey, tarballPath)
    )

    await log.timedSubstep(`Updating index`, () =>
      this.addToIndex({
        stepKey,
        archiveType,
        size,
        currentBranch,
        objectKey,
      })
    )
  }

  async restore(key: string) {
    const tarballPath = path.join(this.tmpdir, key)
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
