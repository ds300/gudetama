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
    .toString()
    .split('\n')
  const currentLines = fs
    .readFileSync(getManifestPath({ stepName }))
    .toString()
    .split('\n')

  let i = 0
  let j = 0
  let safety = 0

  while (i < previousLines.length || j < currentLines.length) {
    if (safety++ > 100) {
      throw new Error('bad times')
    }
    console.log('__comparing__ i', i, 'j', j)
    console.log(previousLines[i], currentLines[j])
    const [previousThing, previousHash] = (previousLines[i] || '').split('\t')
    const [currentThing, currentHash] = (currentLines[j] || '').split('\t')
    if (previousThing === currentThing) {
      i++
      j++
      if (previousHash !== currentHash) {
        console.log('different')
        changes.push(cyan(`${bold(currentThing)} is different`))
      }
    } else if (
      previousThing &&
      (previousThing < currentThing || (previousThing && !currentThing))
    ) {
      i++
      console.log('i removed')
      changes.push(red(`${bold(previousThing)} was removed`))
    } else {
      j++
      console.log('j added')
      changes.push(green(`${bold(currentThing)} was added`))
    }
  }

  return changes
}
