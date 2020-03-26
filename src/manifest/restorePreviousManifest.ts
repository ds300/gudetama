// @ts-check

import { hash } from './hash'
import path from 'path'
import { currentManifestDir } from './manifestDir'
import slugify from '@sindresorhus/slugify'
import { Config } from '../config'

export async function restorePreviousManifest({ config, stepName }: { config: Config; stepName: string }) {
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
