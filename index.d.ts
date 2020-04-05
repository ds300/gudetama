declare module '@artsy/gudetama' {
  export type InputFiles = {
    include?: string[]
    exclude?: string[]
  }

  export interface Step<StepName extends string = string> {
    inputs?: {
      extends?: StepName[]
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

  export type Steps<StepName extends string = string> = {
    [k in StepName]: Step<StepName>
  }

  export interface CacheBackend {
    getObject(objectKey: string, destinationPath: string): Promise<boolean>
    putObject(objectKey: string, sourcePath: string): Promise<void>
    listAllObjects?(): Promise<Array<{ key: string; size: number }>>
    deleteObject?(objectKey: string): Promise<void>
  }

  export interface ConfigFile<StepName extends string = string> {
    repoID: string
    cacheVersion: number
    steps: Steps<StepName>
    getCacheBackend?(): CacheBackend
    currentBranch?: string
    primaryBranch?: string
    manifestDir?: string
  }
}
