import { compareManifests } from './manifest/compareManifests'
import { writeManifest } from './manifest/writeManifest'
import { restorePreviousManifest } from './manifest/restorePreviousManifest'
import { getManifestPath, getStep } from './config'
import { restoreArtifacts } from './restoreArtifacts'
import { runCommand } from './runCommand'
import chalk from 'chalk'
import { getManifestFiles } from './manifest/getManifestFiles'
import { log } from './log'
import { hashFile } from './manifest/hash'
import { restoreCaches } from './restoreCaches'

function required(name: string) {
  return chalk.gray('<') + name + chalk.gray('>')
}

function printHelp() {
  console.log(`USAGE

  ${chalk.bold('gudetama')} ${required('command')} [...args]

COMMANDS

  ${chalk.bold('run-if-needed')} ${required('step name')}
    Runs the given step if the input files specified in the config
    have changed, unless overridden by branch rules.

  ${chalk.bold('run')} ${required('step name')}
    Runs the given step regardless of whether the input files changed,
    unless overriden by branch rules.

  ${chalk.bold('write-manifest')} ${required('name')}
    Generates the manifest file with the given name.
`)
}

const { version } = require('../package.json')

async function run([command, stepName]: string[]) {
  console.log(`${chalk.bold('gudetama')} ${version}\n`)

  switch (command) {
    case 'run-if-needed':
      const done = log.timedTask(`Run '${stepName}' if needed`)
      log.step('Writing manifest file')
      const currentManifestPath = getManifestPath(stepName, 'current')
      writeManifest({
        files: getManifestFiles(stepName),
        outputPath: currentManifestPath,
      })
      log.substep(`Output to ${currentManifestPath}`)

      const currentManifestHash = hashFile(currentManifestPath)

      log.step('Attempting to restore previous manifest file')
      const result = await restorePreviousManifest({
        stepName,
        currentManifestHash,
      })
      switch (result) {
        case 'exact':
          log.step('No need to run, skipping step.')
          log.step('Restoring artifacts')
          await restoreArtifacts(stepName)
          break
        case 'partial':
          const diff = compareManifests(stepName)
          if (diff.length) {
            log.step('These files changed:')
            diff.map(log.substep)
            if (getStep(stepName).caches?.length) {
              log.step('Restoring caches')
              await restoreCaches({
                stepName,
                currentManifestHash,
              })
            }
            runCommand(stepName)
          }
          break
        case null:
          runCommand(stepName)
          break
      }
      if (previous) {
        if (diff.length === 0) {
          console.log('No changes. Not running.')
          await restoreArtifacts({ config, stepName })
          return
        } else {
          console.log(`\n${diff.join('\n')}\n`)
          console.log(`There were ${diff.length} changes.`)
          runCommand({ config, stepName })
        }
      } else {
      }

      break

    case 'write-manifest':
      writeManifest({
        files: getManifestFiles(stepName),
        outputPath: getManifestPath(stepName, 'current'),
      })
      break
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      process.exit(0)
    default:
      printHelp()
      process.exit(1)
  }
}

run(process.argv.slice(2))
