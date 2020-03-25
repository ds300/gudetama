// @ts-check
const crypto = require('crypto')
const fs = require('fs')

/**
 * @param {string} file
 */
function hash(file) {
  const md5 = crypto.createHash('md5')
  md5.update(fs.readFileSync(file))
  return md5.digest('hex')
}

module.exports.hash = hash
