// @ts-check

interface InputFiles {
  extends?: string[]
  include?: string[]
  exclude?: string[]
}

interface Step {
  inputFiles: InputFiles
  artifacts?: string[]
  caches?: string[]
  command?: string
  alwaysRunOnBranches: string[]
  neverRunOnBranches: string[]
}

interface Steps {
  [step_name: string]: Step
}

interface CIConfig {
  currentBranch: string
  primaryBranch: string
}

export interface ConfigFile {
  steps: Steps
  getCacheBackend?(): CacheBackend
  ci?: CIConfig
}

export interface Config {
  steps: Steps
  cache: Cache
  ci: CIConfig
}

import { S3CacheBackend } from './cache/S3CacheBackend'
import { Cache, CacheBackend } from './cache/Cache'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import slugify from '@sindresorhus/slugify'

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch (e) {
    console.error(
      `Can't get name of current git branch. Check that you're in a git repo.`
    )
    process.exit(1)
  }
}

function checkStepNamesDontClash(config: Config) {
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

  const { getCacheBackend, steps, ci } = {
    getCacheBackend() {
      return new S3CacheBackend()
    },
    ci: {
      currentBranch:
        process.env.CIRCLE_BRANCH ||
        process.env.TRAVIS_BRANCH ||
        getCurrentBranch(),
      primaryBranch: 'master',
    },
    ...(require(path.join(process.cwd(), file)) as ConfigFile),
  }

  const config: Config = { steps, cache: new Cache(getCacheBackend()), ci }

  checkStepNamesDontClash(config)

  return config
}

export const config = loadConfig()
