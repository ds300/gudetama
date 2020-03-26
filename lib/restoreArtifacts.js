// @ts-check

const slugify = require('@sindresorhus/slugify')
const path = require('path')
const { hash } = require('./manifest/hash')
const { currentManifestDir } = require('./manifest/manifestDir')

/**
 * @param {import('./config').Config} config
 * @param {string} stepName
 */
function restoreArtifacts(config, stepName) {
  const slug = slugify(stepName)
  const key = `${slug}-artifacts-${hash(path.join(currentManifestDir, slug))}`
  return config.cache.restore(key)
}

module.exports.restoreArtifacts = restoreArtifacts
