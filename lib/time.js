// @ts-check

const colors = require('./colors')

/**
 * @template T
 * @param {string} name
 * @param {() => T | Promise<T>} action
 * @returns Promise<T>
 */
async function time(name, action) {
  const start = Date.now()
  console.log(`${colors.gray('∙')} ${colors.cyan(name)}...`)
  const result = await action
  console.log(
    `${colors.green('✔')} ${colors.cyan(name)} in ${(
      (Date.now() - start) /
      1000
    ).toFixed(2)}s`
  )
  return result
}

module.exports = {
  time,
}
