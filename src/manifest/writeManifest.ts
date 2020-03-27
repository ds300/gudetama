import fs from 'fs-extra'
import { hashFile } from './hash'
import path from 'path'

export async function writeManifest({
  files,
  outputPath,
}: {
  files: string[]
  outputPath: string
}) {
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirpSync(path.dirname(outputPath))
  }
  const out = fs.createWriteStream(outputPath)

  const filesArray = [...files]
  filesArray.sort()
  for (const file of filesArray) {
    out.write(`${file}\t${hashFile(file)}\n`)
  }

  return new Promise((resolve) => {
    out.on('close', resolve)
    out.close()
  })
}
