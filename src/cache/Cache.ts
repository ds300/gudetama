// @ts-check

import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import { spawnSync } from 'child_process'
import { S3CacheBackend } from './S3CacheBackend'
import { time } from '../time'

export interface CacheBackend {
  getObject(key: string, path: string): Promise<boolean>
  putObject(key: string, path: string): Promise<void>
}

export class Cache {
  private tmpdir: string
  constructor(public cache: CacheBackend = new S3CacheBackend()) {
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

  /**
   *
   * @param {string} key
   * @returns {Promise<boolean>}
   */
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
    console.error(`ERROR: Shell command failed: ${command} ${args.join(' ')}`)
    console.error(`\n${result.stderr.toString()}`)
    process.exit(1)
  }
}
