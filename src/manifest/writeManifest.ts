import fs from 'fs-extra'
import { hashFile, hashString } from './hash'
import path from 'path'
import { getManifestPath, getStep } from '../config'
import { getManifestFiles } from './getManifestFiles'
import { exec } from '../exec'

export async function writeManifest({ stepName }: { stepName: string }) {
  const outputPath = getManifestPath({ stepName })
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirpSync(path.dirname(outputPath))
  }
  const out = fs.createWriteStream(outputPath)

  const commandsArray = getStep({ stepName }).inputCommands || []
  commandsArray.sort()
  for (const command of commandsArray) {
    out.write(
      `command [ ${command} ]\t${hashString(
        exec(command, [], { shell: true })
      )}\n`
    )
  }

  const filesArray = [...getManifestFiles({ stepName })]
  filesArray.sort()
  for (const file of filesArray) {
    out.write(`file ${file}\t${hashFile(file)}\n`)
  }

  return new Promise((resolve) => {
    out.on('close', resolve)
    out.close()
  })
}
