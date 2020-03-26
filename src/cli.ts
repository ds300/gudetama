import { compareManifests } from './manifest/compareManifests'
import { writeCurrentManifest } from './manifest/writeCurrentManifest'
import { restorePreviousManifest } from './manifest/restorePreviousManifest'
import { config } from './config'
import { restoreArtifacts } from './restoreArtifacts'
import { runCommand } from './runCommand'

function printHelp() {
  console.log(`USAGE

  gudetama <command> [...args]

COMMANDS

  run-if-needed <name>
    Runs the step named by <name> if the input files specified in the config
    have changed.
  init
    Initialises the .manifest dir structure if need be.

  generate <name>
    Generates the manifest file with the given name.
`)
}

async function run([command, stepName]: string[]) {
  switch (command) {
    case 'run-if-needed':
      writeCurrentManifest({ config, stepName })
      if (config.steps[stepName]) {
      }
      if (await restorePreviousManifest({ config, stepName })) {
        const diff = compareManifests({ stepName })
        if (diff.length === 0) {
          console.log('No changes. Not running.')
          await restoreArtifacts({ config, stepName })
          return
        } else {
          console.log(`\n${diff.join('\n')}\n`)
          console.log(`There were ${diff.length} changes.`)
          runCommand({config, stepName})
        }
      } else {
        console.log(`Couldn't find a previous manifest for ${stepName}.`)
        runCommand({config, stepName})
      }

      break

    case 'write-manifest':
      writeCurrentManifest({ config, stepName })
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
