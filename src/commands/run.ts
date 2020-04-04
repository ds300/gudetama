import { shouldRunStepOnCurrentBranch, renderStepName, config } from '../config'
import { log } from '../log'
import { cyan } from 'kleur'
import { runCommand } from '../runCommand'

export async function run({ stepName }: { stepName: string }) {
  if (shouldRunStepOnCurrentBranch({ stepName }) === 'no') {
    log.task(
      `Skipping ${renderStepName({
        stepName,
      })} because this is the ${cyan(config.currentBranch)} branch`
    )
    return
  }

  const done = log.timedTask(`Running ${renderStepName({ stepName })}`)
  await runCommand({ stepName })
  done('Finished')
}
