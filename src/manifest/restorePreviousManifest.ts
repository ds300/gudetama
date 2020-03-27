import { config, getStepKey } from '../config'
import { store } from '../store/store'
import { log } from '../log'

export async function restorePreviousManifest({
  stepName,
  currentManifestHash,
}: {
  stepName: string
  currentManifestHash: string
}): Promise<'exact' | 'partial' | null> {
  const key = getStepKey(stepName)
  if (await store.restore(`${key}-${currentManifestHash}`)) {
    log.substep(`Found an identical manifest from a previous successful build.`)
    return 'exact'
  }

  if (await store.restore(`${key}-${config.ci.currentBranch}`)) {
    log.substep(
      `Found a manifest from a previous build on ${config.ci.currentBranch}`
    )
    return 'partial'
  }

  if (await store.restore(`${key}-${config.ci.primaryBranch}`)) {
    log.substep(
      `Found a manifest from a previous build on ${config.ci.primaryBranch}`
    )
    return 'partial'
  }

  log.substep(`Couldn't find a previous manifest.`)
  return null
}
