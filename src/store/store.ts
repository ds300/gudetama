import { GudetamaStore } from './GudetamaStore'
import { config } from '../config'
import { writeManifest } from '../manifest/writeManifest'
import { log } from '../log'

export const store = new GudetamaStore(config.getCacheBackend())

async function test() {
  const stepName = 'yarn install'
  await log.timedSubstep('Writing manifest file', () =>
    writeManifest({ stepName })
  )
  await store.save({ stepName })
}

test()
