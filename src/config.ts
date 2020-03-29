import { GudetamaStoreBackend } from './store/GudetamaStore'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import slugify from '@sindresorhus/slugify'
import { log } from './log'
import { S3StoreBackend } from './store/S3StoreBackend'
import { hashString } from './manifest/hash'
import stableStringify from 'fast-json-stable-stringify'

export interface InputFiles {
  extends?: string[]
  include?: string[]
  exclude?: string[]
}

export interface Step {
  inputFiles: InputFiles
  inputCommands: string[]
  artifacts?: string[]
  caches?: string[]
  command?: string
  branches?: {
    only?: string[]
    always?: string[]
    never?: string[]
  }
}

export interface Steps {
  [step_name: string]: Step
}

interface CIConfig {
  currentBranch: string
  primaryBranch: string
}

export interface ConfigFile {
  steps: Steps
  getCacheBackend?(): GudetamaStoreBackend
  ci?: CIConfig
  manifestDir?: string
  cacheVersion: number
}

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

function checkStepNamesDontClash(config: ConfigFile) {
  const keys = new Map<String, String>()
  for (const key of Object.keys(config.steps)) {
    const slug = slugify(key)
    if (keys.has(slug)) {
      log.fail(
        `Step names '${key}' and '${keys.get(
          slug
        )}' are too similar. They both become '${slug}' when slugified.`
      )
    } else {
      keys.set(slug, key)
    }
  }
}

function loadConfig(): Required<ConfigFile> {
  const file = process.env.GUDETAMA_CONFIG_PATH || './gudetama.config.js'
  if (!fs.existsSync(file)) {
    log.fail(`Can't find gudetama config file at '${file}'`)
  }

  const userConfig = require(path.join(process.cwd(), file)) as ConfigFile

  const config = {
    ci: {
      currentBranch:
        process.env.CIRCLE_BRANCH ||
        process.env.TRAVIS_BRANCH ||
        getCurrentBranch(),
      primaryBranch: 'master',
      ...userConfig.ci,
    },
    manifestDir: '.gudetama-manifests',
    getCacheBackend() {
      return new S3StoreBackend()
    },
    ...userConfig,
  }

  checkStepNamesDontClash(config)

  return config
}

export const config = loadConfig()

export function getStep({ stepName }: { stepName: string }) {
  return config.steps[stepName] ?? log.fail(`No step called '${stepName}'`)
}

export function getArchivePaths({ stepName }: { stepName: string }) {
  const step = getStep({ stepName })

  const persistentCachePaths: string[] = []
  const cachePaths: string[] = []
  const artifactPaths: string[] = []

  step.artifacts?.forEach((path) => {
    if (step.caches?.includes(path)) {
      persistentCachePaths.push(path)
    } else {
      artifactPaths.push(path)
    }
  })

  step.caches?.forEach((path) => {
    if (!persistentCachePaths.includes(path)) {
      cachePaths.push(path)
    }
  })

  return { persistentCachePaths, cachePaths, artifactPaths }
}

export function getStepKey({ stepName }: { stepName: string }) {
  const step = getStep({ stepName })
  const slug = slugify(stepName)
  const stepHash = hashString(stableStringify(step))
  return [slug, config.cacheVersion, stepHash].join('-')
}

export function getManifestPath({ stepName }: { stepName: string }) {
  return path.join(config.manifestDir, slugify(stepName))
}
