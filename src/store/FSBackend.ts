import { existsSync, mkdirpSync, copyFileSync } from 'fs-extra'
import { join } from 'path'
import { CacheBackend } from '@artsy/gudetama'

export class FSBackend implements CacheBackend {
  cachePath = join(process.env.HOME || process.cwd(), '.gudetama-cache')
  constructor() {
    mkdirpSync(this.cachePath)
  }
  async getObject(key: string, path: string): Promise<boolean> {
    if (existsSync(join(this.cachePath, key))) {
      copyFileSync(join(this.cachePath, key), path)
      return true
    }
    return false
  }
  async putObject(key: string, path: string): Promise<void> {
    copyFileSync(path, join(this.cachePath, key))
  }
}
