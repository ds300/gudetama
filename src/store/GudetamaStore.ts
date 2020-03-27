import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import { spawnSync } from 'child_process'
import { S3StoreBackend } from './S3StoreBackend'
import { time } from '../time'
import { log } from '../log'

export interface GudetamaStoreBackend {
  getObject(key: string, path: string): Promise<boolean>
  putObject(key: string, path: string): Promise<void>
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

  async save(key: string, paths: string[]) {
    const tarballPath = path.join(this.tmpdir, key)
    time('Creating archive', () => {
      exec('tar', ['cf', tarballPath, ...paths])
    })
    await time('Uploading archive', async () => {
      await this.cache.putObject(key, tarballPath)
    })
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
