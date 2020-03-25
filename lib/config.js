// @ts-check

/**
 * @typedef {{[step_name: string]: {extends?: string[], include?: string[], exclude?: string[], artifacts?: []}}} Steps
 */

/**
 * @typedef {{currentBranch: string, primaryBranch: string}} CIConfig
 */

/**
 * @typedef {{steps: Steps, getCacheBackend(): import('./cache/Cache').CacheBackend, ci: CIConfig}} ConfigFile
 */

/**
 * @typedef {{steps: Steps, cache: import('./cache/Cache').Cache, ci: CIConfig}} Config
 */

const { S3CacheBackend } = require('./cache/S3CacheBackend')
const { Cache } = require('./cache/Cache')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'ignore' })
      .toString()
      .trim()
  } catch (e) {
    console.error(
      `Can't get name of current git branch. Check that you're in a git repo.`
    )
    process.exit(1)
  }
}

/**
 * @type {Partial<ConfigFile>}
 */
const defaults = {
  getCacheBackend() {
    return new S3CacheBackend()
  },
  ci: {
    currentBranch:
      process.env.CIRCLE_BRANCH ||
      process.env.TRAVIS_BRANCH ||
      getCurrentBranch(),
    primaryBranch: 'master'
  }
}

/**
 * @returns {Config}
 */
function loadConfig() {
  const file = process.env.GUDETAMA_CONFIG_PATH || './gudetama.config.js'
  if (!fs.existsSync(file)) {
    console.error(`Can't find gudetama config file at '${file}'`)
  }
  /**
   * @type {Partial<ConfigFile>}
   */
  const { getCacheBackend, steps, ci } = {
    ...defaults,
    ...require(path.relative(process.cwd(), path.join(process.cwd(), file)))
  }
  return { steps, cache: new Cache(getCacheBackend()), ci }
}

module.exports = loadConfig()
