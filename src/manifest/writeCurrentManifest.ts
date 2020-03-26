// @ts-check

import nodeGlob from 'glob'

import fs from 'fs-extra'
import path from 'path'
import { currentManifestDir } from './manifestDir'
import slugify from '@sindresorhus/slugify'
import { hash } from './hash'
import { Config } from '../config'

function expandGlob(glob: string) {
  return nodeGlob.sync(glob, { nodir: true })
}

function getFiles({
  config,
  stepName,
}: {
  config: Config
  stepName: string | number
}) {
  const userConfig = config.steps[stepName]
  if (!userConfig) {
    console.error(`No step found called '${stepName}'`)
    process.exit(1)
  }
  const files = new Set<string>()

  for (const extendedManifest of userConfig.inputFiles.extends || []) {
    for (const file of getFiles({ config, stepName: extendedManifest })) {
      files.add(file)
    }
  }
  for (const glob of userConfig.inputFiles.include || []) {
    for (const file of expandGlob(glob)) {
      files.add(file)
    }
  }
  for (const glob of userConfig.inputFiles.exclude || []) {
    for (const file of expandGlob(glob)) {
      files.delete(file)
    }
  }

  return files
}

export async function writeCurrentManifest({
  config,
  stepName,
}: {
  config: Config
  stepName: string
}) {
  const slug = slugify(stepName)
  if (!fs.existsSync(currentManifestDir)) {
    fs.mkdirpSync(currentManifestDir)
  }
  const filename = path.join(currentManifestDir, slug)
  const files = getFiles({ config, stepName })
  let out = fs.createWriteStream(filename)

  const filesArray = [...files]
  filesArray.sort()
  for (const file of filesArray) {
    out.write(`${file}\t${hash(file)}\n`)
  }

  return new Promise((resolve) => {
    out.on('close', resolve)
    out.close()
  })
}
