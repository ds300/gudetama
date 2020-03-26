// @ts-check

/**
 * @typedef {{extends?: string[], include?: string[], exclude?: string[]}} InputFiles
 */

/**
 * @typedef {{inputFiles: InputFiles, artifacts?: string[], caches?: string[], command?: string, alwaysRunOnBranches: string[], neverRunOnBranches: string[]}} Step
 */

/**
 * @typedef {{[step_name: string]: Step}} Steps
 */

/**
 * @typedef {{currentBranch: string, primaryBranch: string}} CIConfig
 */

/**
 * @typedef {{steps: Steps, getCacheBackend?(): import('./cache/Cache').CacheBackend, ci?: CIConfig}} ConfigFile
 */

/**
 * @typedef {{steps: Steps, cache: import('./cache/Cache').Cache, ci: CIConfig}} Config
 */

const { S3CacheBackend } = require('./cache/S3CacheBackend')
const { Cache } = require('./cache/Cache')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const slugify = require('@sindresorhus/slugify')

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD')
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
 * @param {Config} config
 */
function checkStepNamesDontClash(config) {
  /**
   * @type {Map<string, string>}
   */
  const keys = new Map()
  for (const key of Object.keys(config.steps)) {
    const slug = slugify(key)
    if (keys.has(slug)) {
      console.error(
        `Step names '${key}' and '${keys.get(
          slug
        )}' are too similar. They both become '${slug}' when slugified.`
      )
    } else {
      keys.set(slug, key)
    }
  }
}

/**
 * @returns {Config}
 */
function loadConfig() {
  const file = process.env.GUDETAMA_CONFIG_PATH || './gudetama.config.js'
  if (!fs.existsSync(file)) {
    console.error(`Can't find gudetama config file at '${file}'`)
    process.exit(1)
  }
  /**
   * @type {Partial<ConfigFile>}
   */
  const { getCacheBackend, steps, ci } = {
    ...defaults,
    ...require(path.join(process.cwd(), file))
  }
  const config = { steps, cache: new Cache(getCacheBackend()), ci }

  checkStepNamesDontClash(config)

  return config
}

module.exports = loadConfig()
