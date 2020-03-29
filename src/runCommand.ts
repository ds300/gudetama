import { spawnSync } from 'child_process'
import { store } from './store/store'
import { getStep } from './config'
import { log } from './log'
import chalk from 'chalk'

export async function runCommand({ stepName }: { stepName: string }) {
  await store.restoreCaches({ stepName })
  const step = getStep({ stepName })
  const command = step.command || stepName
  log.step(chalk.greenBright.bold(command))
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
  console.log(chalk.gray(`\n              ∙  ∙  ∙\n`))
  log.step(
    `Done in ${chalk.cyan(((Date.now() - start) / 1000).toFixed(2) + 's')}`
  )
  await store.save({ stepName })
}
