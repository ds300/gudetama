import { spawnSync } from 'child_process'
import { store } from './store/store'
import { getStep } from './config'
import { log } from './log'
import chalk from 'chalk'

export async function runCommand({ stepName }: { stepName: string }) {
  await store.restoreCaches({ stepName })
  const step = getStep({ stepName })
  const command = step.command || stepName
  log.step(`Running '${chalk.bold(command)}'`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  if (result.status != 0) {
    log.fail(`Command '${command}' failed with exit code ${result.status}`, {
      error: result.error,
      detail: result.stderr?.toString?.(),
    })
  }
  await store.save({ stepName })
}
