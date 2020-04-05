import { spawnSync } from 'child_process'
import { getStep } from './config'
import { log } from './log'
import { green, gray, cyan } from 'kleur'
import { GudetamaStore } from './store/GudetamaStore'

export async function runCommand({ stepName }: { stepName: string }) {
  const store = GudetamaStore.fromConfig()
  await store.restoreCaches({ stepName })
  const step = getStep({ stepName })
  const command = step.command || stepName
  log.step(green().bold(command))
  const start = Date.now()
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  if (result.status != 0) {
    log.fail(
      `Command '${command}' failed${
        result.status != null ? ` with exit code ${result.status}` : ''
      }`,
      {
        error: result.error,
      }
    )
  }
  log.log(gray(`\n              ∙  ∙  ∙\n`))
  log.step(`Done in ${cyan(((Date.now() - start) / 1000).toFixed(2) + 's')}`)
  await store.save({ stepName })
}
