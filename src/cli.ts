import { writeManifest } from './manifest/writeManifest'
import { version } from '../package.json'
import { bold } from 'kleur'
import { runIfNeeded } from './commands/run-if-needed'
import { help } from './commands/help'
import { run } from './commands/run'
import { prune } from './commands/prune'

async function cli([command, stepName]: string[]) {
  if (command.match(/^(-v|--version)$/)) {
    console.log(version)
    process.exit()
  }
  console.log(`${bold('gudetama')} ${version}`)

  switch (command) {
    case 'run-if-needed':
      await runIfNeeded({ stepName })
      break
    case 'run':
      await run({ stepName })
      break
    case 'write-manifest':
      writeManifest({ stepName })
      break
    case 'prune':
      await prune()
      break
    case 'help':
    case '--help':
    case '-h':
      help()
      process.exit(0)
    default:
      help()
      process.exit(1)
  }
}

cli(process.argv.slice(2))
