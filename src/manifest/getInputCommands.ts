import { getStep } from '../config'

export function getInputCommands({ stepName }: { stepName: string }) {
  const { inputs } = getStep({ stepName })
  const commands = new Set<string>()

  for (const extendedStepName of inputs?.extends ?? []) {
    for (const command of getInputCommands({ stepName: extendedStepName })) {
      commands.add(command)
    }
  }

  for (const command of inputs?.commands ?? []) {
    commands.add(command)
  }

  return [...commands]
}
