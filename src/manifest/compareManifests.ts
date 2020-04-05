import fs from 'fs'
import { getManifestPath } from '../config'
import { cyan, bold, red, green } from 'kleur'

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
    .toString().trim()
    .split('\n')
  const currentLines = fs
    .readFileSync(getManifestPath({ stepName }))
    .toString().trim()
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
        changes.push(cyan(`${bold(currentThing)} is different`))
      }
    } else if (
      previousThing &&
      (previousThing < currentThing || (previousThing && !currentThing))
    ) {
      i++
      changes.push(red(`${bold(previousThing)} was removed`))
    } else {
      j++
      changes.push(green(`${bold(currentThing)} was added`))
    }
  }

  return changes
}
