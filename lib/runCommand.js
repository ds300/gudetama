// @ts-check
const { spawnSync } = require('child_process')
/**
 * @param {import('./config').Config} config
 * @param {string} stepName
 */
function runCommand(config, stepName) {
  const artifacts = config.steps[stepName].artifacts
  const command = config.steps[stepName].command || stepName
  const result = spawnSync(command)
}
