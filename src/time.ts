import chalk from 'chalk'

export async function time<T>(
  name: string,
  action: () => T | Promise<T>
): Promise<T> {
  const start = Date.now()
  console.log(`${chalk.gray('∙')} ${chalk.cyan(name)}...`)
  const result = await action()
  console.log(
    `${chalk.green('✔')} ${chalk.cyan(name)} in ${(
      (Date.now() - start) /
      1000
    ).toFixed(2)}s`
  )
  return result
}
