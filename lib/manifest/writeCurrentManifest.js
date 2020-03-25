// @ts-check

const nodeGlob = require('glob')

const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')
const { currentManifestDir } = require('./manifestDir')

/**
 * @param {string} file
 */
function hash(file) {
  const md5 = crypto.createHash('md5')
  md5.update(fs.readFileSync(file))
  return md5.digest('hex')
}

/**
 * @param glob {string}
 */
function expandGlob(glob) {
  return nodeGlob.sync(glob, { nodir: true })
}

/**
 * @param config {import('../config').Config}
 * @param stepName {string}
 * @returns {Set<string>}
 */
function getFiles(config, stepName) {
  const userConfig = config.steps[stepName]
  if (!userConfig) {
    console.error(`No config found called '${stepName}'`)
    process.exit(1)
  }
  /**
   * @type {Set<string>}
   */
  const files = new Set()

  for (const extendedManifest of userConfig.extends || []) {
    for (const file of getFiles(config, extendedManifest)) {
      files.add(file)
    }
  }
  for (const glob of userConfig.include || []) {
    for (const file of expandGlob(glob)) {
      files.add(file)
    }
  }
  for (const glob of userConfig.exclude || []) {
    for (const file of expandGlob(glob)) {
      files.delete(file)
    }
  }

  return files
}

/**
 *
 * @param {import('../config').Config} config
 * @param {string} stepName
 */
async function writeCurrentManifest(config, stepName) {
  if (!fs.existsSync(currentManifestDir)) {
    fs.mkdirpSync(currentManifestDir)
  }
  const filename = path.join(currentManifestDir, stepName)
  const files = getFiles(config, stepName)
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

module.exports.writeCurrentManifest = writeCurrentManifest
