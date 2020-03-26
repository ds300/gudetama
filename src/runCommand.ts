import { spawnSync } from 'child_process'
import { Config } from './config'

export function runCommand({
  config,
  stepName,
}: {
  config: Config
  stepName: string
}) {
  const artifacts = config.steps[stepName].artifacts
  const command = config.steps[stepName].command || stepName
  const result = spawnSync(command)
}
