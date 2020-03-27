import chalk from 'chalk'

function decapitalize(str: string) {
  return str && str[0].toLowerCase() + str.slice(1)
}

function timedSubstep(str: string): () => void
function timedSubstep<T>(str: string, task: () => T | Promise<T>): Promise<T>
function timedSubstep() {
  const [str, task] = arguments
  process.stdout.write(chalk.grey('  ' + str + '...'))
  const start = Date.now()
  const done = () => {
    process.stdout.write(chalk.cyan(' ' + timeSince(start) + '\n'))
  }
  if (task) {
    return Promise.resolve(task()).then((result: any) => {
      done()
      return result
    })
  }
  return done
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
  timedSubstep,
  timedTask: (str: string) => {
    log.task(str)
    const start = Date.now()
    return (msg: string = `Finished ${decapitalize(str)}`) => {
      log.success(`${msg} in ${timeSince(start)}`)
    }
  },
}

const timeSince = (start: number) =>
  `${((Date.now() - start) / 1000).toFixed(2)}s`
