import { getStep } from '../config'
import glob from 'glob'

export function getManifestFiles(stepName: string) {
  const { inputFiles } = getStep(stepName)
  const files = new Set<string>()

  for (const extendedManifest of inputFiles.extends || []) {
    for (const file of getManifestFiles(extendedManifest)) {
      files.add(file)
    }
  }
  for (const globPattern of inputFiles.include || []) {
    for (const file of glob.sync(globPattern, { nodir: true })) {
      files.add(file)
    }
  }
  for (const globPattern of inputFiles.exclude || []) {
    for (const file of glob.sync(globPattern, { nodir: true })) {
      files.delete(file)
    }
  }

  return [...files]
}
