import { compareManifests } from './manifest/compareManifests'
import { writeManifest } from './manifest/writeManifest'
import { getManifestPath } from './config'
import { runCommand } from './runCommand'
import chalk from 'chalk'
import { log } from './log'
import { store } from './store/store'

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
  console.log(`${chalk.bold('gudetama')} ${version}`)

  switch (command) {
    case 'run-if-needed':
      const done = log.timedTask(
        `Run ${chalk.gray("'")}${stepName}${chalk.gray("'")} if needed`
      )
      const currentManifestPath = getManifestPath({ stepName })
      await log.timedStep(
        `Computing manifest file ${chalk.bold(currentManifestPath)}`,
        () => writeManifest({ stepName })
      )

      const result = await store.restoreManifest({ stepName })

      let didRunCommand = false

      switch (result.type) {
        case 'exact':
          log.step('Found an indentical manifest from a previous build! 🙌')
          if (!(await store.restoreArtifacts({ stepName }))) {
            await runCommand({ stepName })
            didRunCommand = true
          }
          break
        case 'partial':
          log.step(
            `Comparing against a previous successful build on ${chalk.bold(
              result.previousManifestBranch
            )}`
          )
          const diff = compareManifests({
            stepName,
            previousManifestPath: result.previousManifestPath,
          })
          if (diff.length) {
            console.log()
            diff.map(log.substep)
            console.log()
          } else {
            log.substep(`No changes found, this probably should not happen 🤔`)
          }
          await runCommand({ stepName })
          didRunCommand = true
          break
        case 'none':
          await runCommand({ stepName })
          didRunCommand = true
          break
      }
      if (!didRunCommand) {
        log.step(`Didn't need to run! 🎉`)
      }
      done('Finished')
      break
    case 'write-manifest':
      writeManifest({ stepName })
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
