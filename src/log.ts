import chalk from 'chalk'

function decapitalize(str: string) {
  return str && str[0].toLowerCase() + str.slice(1)
}

export const log = {
  fail(headline: string, more?: { error?: Error; detail?: string }) {
    console.error(chalk.red.bold('∙ ERROR ∙'), chalk.redBright(headline))
    more?.detail && console.error('\n' + more.detail)
    more?.error && console.error('\n', more.error)
    process.exit(1)
  },
  task: (str: string) =>
    console.log(chalk.green('\n::'), chalk.bold(str), chalk.green('::\n')),
  step: (str: string) => console.log(chalk.cyan(`•`), str),
  substep: (str: string) => console.log(chalk.grey('  ' + str)),
  success: (str: string) =>
    console.log('\n' + chalk.green(`✔`), chalk.bold(str)),
  info: (str: string) => console.log('💡', str),
  timedTask: (str: string) => {
    log.task(str)
    const start = Date.now()
    return (msg: string = `Finished ${decapitalize(str)}`) => {
      log.success(`${msg} in ${((Date.now() - start) / 1000).toFixed(2)}s`)
    }
  },
}
