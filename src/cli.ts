import { writeManifest } from './manifest/writeManifest'
import { version } from '../package.json'
import { bold } from 'kleur'
import { runIfNeeded } from './commands/run-if-needed'
import { help } from './commands/help'
import { run } from './commands/run'
import { prune } from './commands/prune'
import { silence } from './log'

async function cli(args: string[]) {
  if (args.includes('--version' || args.includes('-v'))) {
    console.log(version)
    process.exit()
  }
  if (args.includes('--help' || args.includes('-h'))) {
    help()
    process.exit()
  }
  if (args.includes('--silent')) {
    silence()
  } else {
    console.log(`${bold('gudetama')} ${version}`)
  }

  const [command, stepName] = args
  if (!command || !stepName) {
    help(true)
    process.exit(1)
  }

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
      help()
      process.exit(0)
    default:
      help(true)
      process.exit(1)
  }
}

cli(process.argv.slice(2))
