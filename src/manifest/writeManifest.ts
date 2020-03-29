import fs from 'fs-extra'
import { hashFile } from './hash'
import path from 'path'
import { getManifestPath } from '../config'
import { getManifestFiles } from './getManifestFiles'

export async function writeManifest({ stepName }: { stepName: string }) {
  const outputPath = getManifestPath({ stepName })
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirpSync(path.dirname(outputPath))
  }
  const out = fs.createWriteStream(outputPath)

  const filesArray = [...getManifestFiles({ stepName })]
  filesArray.sort()
  for (const file of filesArray) {
    out.write(`${file}\t${hashFile(file)}\n`)
  }

  return new Promise((resolve) => {
    out.on('close', resolve)
    out.close()
  })
}
