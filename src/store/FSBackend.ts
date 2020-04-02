import fs from 'fs-extra'
import { join } from 'path'
import { CacheBackend } from '@artsy/gudetama'

export class FSBackend implements CacheBackend {
  cachePath = join(process.env.HOME || process.cwd(), '.gudetama-cache')
  constructor() {
    fs.mkdirsSync(this.cachePath)
  }
  async getObject(key: string, path: string): Promise<boolean> {
    if (fs.existsSync(join(this.cachePath, key))) {
      fs.copyFileSync(join(this.cachePath, key), path)
      return true
    }
    return false
  }
  async putObject(key: string, path: string): Promise<void> {
    fs.copyFileSync(path, join(this.cachePath, key))
  }
}
