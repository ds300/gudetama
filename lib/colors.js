// @ts-check

/**
 * @param s {string}
 */
function bold(s) {
  return `\u001b[1m${s}\u001b[0m`
}

module.exports.bold = bold

/**
 * @param s {string}
 */
function cyan(s) {
  return `\u001b[36;1m${s}\u001b[0m`
}

module.exports.cyan = cyan

/**
 * @param s {string}
 */
function gray(s) {
  return `\u001b[38;5;244m${s}\u001b[0m`
}

module.exports.gray = gray

/**
 * @param s {string}
 */
function green(s) {
  return `\u001b[32;1m${s}\u001b[0m`
}

module.exports.green = green
