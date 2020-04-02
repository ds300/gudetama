import { getStep } from '../config'
import glob from 'glob'
import fs from 'fs'
import path from 'path'

export function getManifestFiles({ stepName }: { stepName: string }) {
  const { inputFiles } = getStep({ stepName })
  const files = new Set<string>()

  for (const extendedStepName of inputFiles?.extends ?? []) {
    for (const file of getManifestFiles({ stepName: extendedStepName })) {
      files.add(file)
    }
  }
  for (const globPattern of inputFiles?.include ?? []) {
    for (const file of glob.sync(globPattern)) {
      if (fs.statSync(file).isDirectory()) {
        visitAllFiles(file, (filePath) => files.add(filePath))
      } else {
        files.add(file)
      }
    }
  }
  for (const globPattern of inputFiles?.exclude ?? []) {
    for (const file of glob.sync(globPattern)) {
      if (fs.statSync(file).isDirectory()) {
        visitAllFiles(file, (filePath) => files.delete(filePath))
      } else {
        files.delete(file)
      }
    }
  }

  return [...files]
}

function visitAllFiles(dir: string, visit: (filePath: string) => void) {
  for (const fileName of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, fileName)
    if (fs.statSync(fullPath).isDirectory()) {
      visitAllFiles(fullPath, visit)
    } else {
      visit(fullPath)
    }
  }
}
