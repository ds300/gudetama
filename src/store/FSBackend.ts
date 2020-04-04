import fs from 'fs-extra'
import { join } from 'path'
import { CacheBackend } from '@artsy/gudetama'

export class FSBackend implements CacheBackend {
  cachePath = join(process.env.HOME || process.cwd(), '.gudetama-cache')
  constructor() {
    fs.mkdirsSync(this.cachePath)
  }
  async getObject(
    objectKey: string,
    destinationPath: string
  ): Promise<boolean> {
    if (fs.existsSync(join(this.cachePath, objectKey))) {
      fs.copyFileSync(join(this.cachePath, objectKey), destinationPath)
      return true
    }
    return false
  }
  async putObject(objectKey: string, sourcePath: string): Promise<void> {
    fs.copyFileSync(sourcePath, join(this.cachePath, objectKey))
  }
  async deleteObject(objectKey: string) {
    if (fs.existsSync(join(this.cachePath, objectKey))) {
      fs.unlinkSync(join(this.cachePath, objectKey))
    }
  }
  async listAllObjects() {
    const result: Array<{ key: string; size: number }> = []

    for (const objectKey in fs.readdirSync(this.cachePath)) {
      const stat = fs.statSync(objectKey)
      if (stat.isFile()) {
        result.push({ key: objectKey, size: stat.size })
      }
    }

    return result
  }
}
