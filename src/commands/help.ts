import { gray, bold } from 'kleur'

function required(name: string) {
  return gray('<') + name + gray('>')
}

export function help() {
  console.log(`USAGE

  ${bold('gudetama')} ${required('command')} [...args]

COMMANDS

  ${bold('run-if-needed')} ${required('step name')}
    Runs the given step if the input files specified in the config
    have changed, unless overridden by branch rules.

  ${bold('run')} ${required('step name')}
    Runs the given step regardless of whether the input files changed,
    unless overriden by branch rules.

  ${bold('write-manifest')} ${required('name')}
    Generates the manifest file with the given name.

  ${bold('prune')}
    Prunes the cache

  ${bold('help')}
    Prints this help message
`)
}
