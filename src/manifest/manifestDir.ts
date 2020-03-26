// @ts-check
import path from 'path'

export const manifestDir =
  process.env.GUDETAMA_MANIFEST_DIR || '.gudetama-manifests'
export const currentManifestDir = path.join(manifestDir, 'current')
export const previousManifestDir = path.join(manifestDir, 'previous')
