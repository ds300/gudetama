// @ts-check

const { hash } = require('./hash')
const path = require('path')
const { currentManifestDir } = require('./manifestDir')
const slugify = require('@sindresorhus/slugify')

/**
 * @param {import('../config').Config} config
 * @param {string} stepName
 * @returns {Promise<boolean>}
 */
async function restorePreviousManifest(config, stepName) {
  const slug = slugify(stepName)
  for (const key in [
    `${slug}-${hash(path.join(currentManifestDir, slug))}`,
    `${slug}-${config.ci.currentBranch}`,
    `${slug}-${config.ci.primaryBranch}`,
  ]) {
    if (await config.cache.restore(key)) {
      return true
    }
  }
  return false
}

module.exports.restorePreviousManifest = restorePreviousManifest
