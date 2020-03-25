// @ts-check

/**
 * @param s {string}
 */
function bold(s) {
  return `\u001b[1m${s}\u001b[0m`
}

/**
 * @param s {string}
 */
function cyan(s) {
  return `\u001b[36;1m${s}\u001b[0m`
}

/**
 * @param s {string}
 */
function gray(s) {
  return `\u001b[38;5;244m${s}\u001b[0m`
}
