// @ts-check

const fs = require('fs')
const path = require('path')
const { currentManifestDir, previousManifestDir } = require('./manifestDir')

/**
 * @param stepName {string}
 * @returns {string[]}
 */
function compareManifests(stepName) {
  const changes = []
  const previousLines = fs
    .readFileSync(path.join(currentManifestDir, 'previous', stepName))
    .toString()
    .split('\n')
  const currentLines = fs
    .readFileSync(path.join(previousManifestDir, 'current', stepName))
    .toString()
    .split('\n')

  let i = 0
  let j = 0

  while (i < previousLines.length || j < currentLines.length) {
    const [filePrevious, previousHash] = (previousLines[i] || '').split('\t')
    const [fileCurrent, currentHash] = (currentLines[j] || '').split('\t')
    if (filePrevious === fileCurrent) {
      i++
      j++
      if (previousHash !== currentHash) {
        changes.push(`${bold(fileCurrent)} ${gray('was modified')}`)
      }
    } else if (filePrevious < fileCurrent || (filePrevious && !fileCurrent)) {
      i++
      changes.push(`${bold(filePrevious)} ${gray('was deleted')}`)
    } else {
      j++
      changes.push(`${bold(fileCurrent)} ${gray('was created')}`)
    }
  }

  return changes
}

module.exports.compareManifests = compareManifests
