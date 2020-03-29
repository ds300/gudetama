import fs from 'fs'
import { getManifestPath } from '../config'
import chalk from 'chalk'

export function compareManifests({
  stepName,
  previousManifestPath,
}: {
  stepName: string
  previousManifestPath: string
}) {
  const changes = []
  const previousLines = fs
    .readFileSync(previousManifestPath)
    .toString()
    .split('\n')
  const currentLines = fs
    .readFileSync(getManifestPath({ stepName }))
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
        changes.push(`${chalk.bold(fileCurrent)} was modified`)
      }
    } else if (filePrevious < fileCurrent || (filePrevious && !fileCurrent)) {
      i++
      changes.push(`${chalk.bold(filePrevious)} was deleted`)
    } else {
      j++
      changes.push(`${chalk.bold(fileCurrent)} was created`)
    }
  }

  return changes
}
