declare module '@artsy/gudetama' {
  export type InputFiles = {
    include?: string[]
    exclude?: string[]
  }

  export interface Step {
    inputs?: {
      extends?: string[]
      files?: InputFiles
      commands?: string[]
    }
    outputFiles?: string[]
    caches?: string[]
    command?: string
    branches?: {
      only?: string[]
      always?: string[]
      never?: string[]
    }
  }

  export interface Steps {
    [step_name: string]: Step
  }

  export interface CacheBackend {
    getObject(objectKey: string, destinationPath: string): Promise<boolean>
    putObject(objectKey: string, sourcePath: string): Promise<void>
    listAllObjects?(): Promise<Array<{ key: string; size: number }>>
    deleteObject?(objectKey: string): Promise<void>
  }

  export interface ConfigFile {
    repoID: string
    cacheVersion: number
    steps: Steps
    getCacheBackend?(): CacheBackend
    currentBranch?: string
    primaryBranch?: string
    manifestDir?: string
  }
}
