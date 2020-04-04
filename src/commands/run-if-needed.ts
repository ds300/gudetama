import {
  getManifestPath,
  config,
  shouldRunStepOnCurrentBranch,
  renderStepName,
} from '../config'
import { cyan, bold } from 'kleur'
import { runCommand } from '../runCommand'
import { writeManifest } from '../manifest/writeManifest'
import { store } from '../store/store'
import { compareManifests } from '../manifest/compareManifests'
import { log } from '../log'

export async function runIfNeeded({ stepName }: { stepName: string }) {
  switch (shouldRunStepOnCurrentBranch({ stepName })) {
    case 'always':
      const done = log.timedTask(
        `Running ${renderStepName({
          stepName,
        })} because this is the ${cyan(config.currentBranch)} branch`
      )
      await runCommand({ stepName })
      done('Finished')
      return
    case 'no':
      log.task(
        `Skipping ${renderStepName({
          stepName,
        })} because this is the ${cyan(config.currentBranch)} branch`
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
        stepName,
        previousManifestPath: result.previousManifestPath,
      })
      if (diff.length) {
        console.log()
        diff.map(log.substep)
        console.log()
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
