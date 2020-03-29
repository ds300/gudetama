import { spawnSync } from 'child_process'
import { store } from './store/store'
import { getStep } from './config'
import { log } from './log'
import chalk from 'chalk'

const numColumns = Math.min(process.stdout.columns || 80, 80)
const separator =
  '\n' +
  chalk.gray(new Array(Math.floor(numColumns / 2)).fill('∙').join(' ')) +
  '\n'

export async function runCommand({ stepName }: { stepName: string }) {
  await store.restoreCaches({ stepName })
  const step = getStep({ stepName })
  const command = step.command || stepName
  log.step(`exec ${chalk.cyan.bold(command)}`)
  console.log(separator)
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
  console.log(separator)
  await store.save({ stepName })
}
