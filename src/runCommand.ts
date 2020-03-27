import { spawnSync } from 'child_process'
import { getStep, getStepKey } from './config'
import { store } from './store/store'
import { restoreCaches } from './restoreCaches'

function intersection(a: string[], b: string[]) {
  const result = []
  for (const e in a) {
    if (b.includes(e)) {
      result.push(e)
    }
  }
  return result
}

export function runCommand(stepName: string) {
  const { artifacts, caches, command = stepName } = getStep(stepName)
  const result = spawnSync(command)
  if (result.status)
}
