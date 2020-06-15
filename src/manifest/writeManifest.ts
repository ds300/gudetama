import fs from 'fs-extra'
import path from 'path'
import { getManifestPath } from '../config'
import { getManifest } from './getManifest'

export async function writeManifest({ stepName }: { stepName: string }) {
  const outputPath = getManifestPath({ stepName })
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirpSync(path.dirname(outputPath))
  }
  const out = fs.createWriteStream(outputPath)

  for (const line of getManifest({ stepName })) {
    out.write(line)
    out.write('\n')
  }

  return new Promise((resolve) => {
    out.on('close', resolve)
    out.close()
  })
}
