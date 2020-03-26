// @ts-check

import slugify from '@sindresorhus/slugify'
import path from 'path'
import { hash } from './manifest/hash'
import { currentManifestDir } from './manifest/manifestDir'
import { Config } from './config'

export function restoreArtifacts({
  config,
  stepName,
}: {
  config: Config
  stepName: string
}) {
  const slug = slugify(stepName)
  const key = `${slug}-artifacts-${hash(path.join(currentManifestDir, slug))}`
  return config.cache.restore(key)
}
