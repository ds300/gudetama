// @ts-check

const { hash } = require('./hash')
const path = require('path')
const { currentManifestDir, previousManifestDir } = require('./manifestDir')

/**
 * @param {import('../config').Config} config
 * @param {string} stepName
 */
async function restorePreviousManifest(config, stepName) {
  for (const key in [
    `${stepName}-${hash(path.join(currentManifestDir, stepName))}`,
    `${stepName}-${config.ci.currentBranch}`,
    `${stepName}-${config.ci.primaryBranch}`,
  ]) {
    if (await config.cache.restore(key)) {
      break
    }
  }
}

module.exports.restorePreviousManifest = restorePreviousManifest
