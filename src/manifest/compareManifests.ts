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
    const [previousThing, previousHash] = (previousLines[i] || '').split('\t')
    const [currentThing, currentHash] = (currentLines[j] || '').split('\t')
    if (previousThing === currentThing) {
      i++
      j++
      if (previousHash !== currentHash) {
        changes.push(`${chalk.bold(currentThing)} was different`)
      }
    } else if (
      previousThing < currentThing ||
      (previousThing && !currentThing)
    ) {
      i++
      changes.push(`${chalk.bold(previousThing)} was removed`)
    } else {
      j++
      changes.push(`${chalk.bold(currentThing)} was added`)
    }
  }

  return changes
}
