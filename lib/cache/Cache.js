// @ts-check

const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const { spawnSync } = require('child_process')
const { S3CacheBackend } = require('./S3CacheBackend')
const { time } = require('../time')

/**
 * @typedef {{ getObject(key: string, path: string): Promise<boolean>, putObject(key: string, path: string): Promise<void> }} CacheBackend
 */

/**
 * @typedef {{ accessKeyId: string, secretAccessKey: string, bucket: string }} S3Config
 */
class Cache {
  /**
   * @param {CacheBackend} cache
   */
  constructor(cache = new S3CacheBackend()) {
    this.cache = cache
    this.tmpdir = fs.mkdtempSync(path.join(process.env.TMPDIR, 'gudetama-'))
    process.addListener('exit', () => {
      rimraf.sync(this.tmpdir)
    })
  }

  /**
   * @param {string} key
   * @param {string[]} paths
   * @returns {Promise<void>}
   */
  async save(key, paths) {
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
  async restore(key) {
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

module.exports.Cache = Cache

/**
 * @param {string} command
 * @param {string[]} args
 */
function exec(command, args) {
  const result = spawnSync(command, args)
  if (result.status !== 0) {
    console.error(`ERROR: Shell command failed: ${command} ${args.join(' ')}`)
    console.error(`\n${result.stderr.toString()}`)
    process.exit(1)
  }
}
