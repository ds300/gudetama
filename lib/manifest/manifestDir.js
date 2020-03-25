// @ts-check
const path = require('path')

module.exports.manifestDir =
  process.env.GUDETAMA_MANIFEST_DIR || '.gudetama-manifests'
module.exports.currentManifestDir = path.join(
  module.exports.manifestDir,
  'current'
)
module.exports.previousManifestDir = path.join(
  module.exports.manifestDir,
  'previous'
)
