import {
  getManifestPath,
  shouldRunStepOnCurrentBranch,
  renderStepName,
  getConfig,
} from '../config'
import { cyan, bold } from 'kleur'
import { runCommand } from '../runCommand'
import { writeManifest } from '../manifest/writeManifest'
import { compareManifests, renderChange } from '../manifest/compareManifests'
import { log } from '../log'
import { GudetamaStore } from '../store/GudetamaStore'
import fs from 'fs'

export async function runIfNeeded({ stepName }: { stepName: string }) {
  const store = GudetamaStore.fromConfig()
  switch (shouldRunStepOnCurrentBranch({ stepName })) {
    case 'always': {
      const done = log.timedTask(
        `Running ${renderStepName({
          stepName,
        })} because this is the ${cyan(getConfig().currentBranch)} branch`
      )
      await runCommand({ stepName })
      done('Finished')
      return
    }
    case 'always because no inputs': {
      const done = log.timedTask(
        `Running ${renderStepName({
          stepName,
        })} because the task has no declared inputs`
      )
      await runCommand({ stepName })
      done('Finished')
      return
    }
    case 'no':
      log.task(
        `Skipping ${renderStepName({
          stepName,
        })} because this is the ${cyan(getConfig().currentBranch)} branch`
      )
      return
    case 'maybe':
      // alright let's figure it out
      break
  }

  const done = log.timedTask(`Run ${renderStepName({ stepName })} if needed`)
  const currentManifestPath = getManifestPath({ stepName })
  await log.timedStep(
    `Computing manifest file ${bold(currentManifestPath)}`,
    () => writeManifest({ stepName })
  )

  const result = await store.restoreManifest({ stepName })

  let didRunCommand = false

  switch (result.type) {
    case 'exact':
      log.step('Found an identical manifest from a previous build! 🙌')
      if (!(await store.restoreArtifacts({ stepName }))) {
        await runCommand({ stepName })
        didRunCommand = true
      }
      break
    case 'partial':
      log.step(
        `Comparing against a previous successful build on ${bold(
          result.previousManifestBranch
        )}`
      )
      const diff = compareManifests({
        currentManifest: fs
          .readFileSync(getManifestPath({ stepName }))
          .toString(),
        previousManifest: fs
          .readFileSync(result.previousManifestPath)
          .toString(),
      })
      if (diff.length) {
        log.log()
        diff.map(renderChange).forEach(log.substep)
        log.log()
      } else {
        log.substep(`No changes found, this probably should not happen 🤔`)
      }
      await runCommand({ stepName })
      didRunCommand = true
      break
    case 'none':
      await runCommand({ stepName })
      didRunCommand = true
      break
  }
  if (!didRunCommand) {
    log.step(`Didn't need to run! 🎉`)
  }
  done('Finished')
}
