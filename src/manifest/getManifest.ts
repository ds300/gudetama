import { hashFile, hashString } from './hash'
import { getInputFiles } from './getInputFiles'
import { exec } from '../exec'
import { getInputCommands } from './getInputCommands'

export function getManifest({ stepName }: { stepName: string }) {
  const result: string[] = []

  for (const command of getInputCommands({ stepName })) {
    result.push(
      `command [ ${command} ]\t${hashString(
        exec(command, [], { shell: true })
      )}`
    )
  }

  for (const file of getInputFiles({ stepName })) {
    result.push(`file ${file}\t${hashFile(file)}`)
  }

  result.sort()
  return result
}
