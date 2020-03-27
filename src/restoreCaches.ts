import { getStepKey, config } from './config'
import { store } from './store/store'
import { log } from './log'

export async function restoreCaches({
  stepName,
  currentManifestHash,
}: {
  stepName: string
  currentManifestHash: string
}): Promise<'exact' | 'partial' | null> {
  const key = getStepKey(stepName)
  if (await store.restore(`${key}-caches-${currentManifestHash}`)) {
    log.substep(`Found exact cache from a previous successful build.`)
    return 'exact'
  }

  if (await store.restore(`${key}-caches-${config.ci.currentBranch}`)) {
    log.substep(
      `Found a cache from a previous build on ${config.ci.currentBranch}`
    )
    return 'partial'
  }

  if (await store.restore(`${key}-caches-${config.ci.primaryBranch}`)) {
    log.substep(
      `Found a cache from a previous build on ${config.ci.primaryBranch}`
    )
    return 'partial'
  }

  log.substep(`Couldn't find a previous cache.`)
  return null
}
