import { spawnSync } from 'child_process'
import slugify from '@sindresorhus/slugify'
import os from 'os'
import path from 'path'
import rimraf from 'rimraf'
import { ConfigFile } from '@artsy/gudetama'
import { writeFileSync } from 'fs-extra'
import stripAnsi from 'strip-ansi'
import { red } from 'kleur'

type ExecResult =
  | {
      type: 'success'
      output: string
    }
  | {
      type: 'failure'
      status: number
      output: string
    }

function createScopedSpawn({ dir, shell }: { dir: string; shell?: boolean }) {
  const allowFailure = (command: string, args?: string[]): ExecResult => {
    const result = spawnSync(command, args, {
      cwd: dir,
      shell,
      env: {
        ...process.env,
        GUDETAMA_CACHE_DIR: path.join(dir, '.gudetama-cache'),
      },
    })
    if (result.error) {
      console.error(result.error)
      throw new Error(`Failed to execute '${command} ${args?.join(' ') || ''}'`)
    }
    if (result.status === 0) {
      return {
        type: 'success',
        output: stripAnsi(result.stdout.toString().trim()),
      }
    } else {
      return {
        type: 'failure',
        output: stripAnsi(result.stderr.toString().trim()),
        status: result.status!,
      }
    }
  }

  const throwOnFailure = (...args: Parameters<typeof allowFailure>): string => {
    const result = allowFailure(...args)
    if (result.type === 'failure') {
      const command =
        args.length === 1 ? args[0] : args[0] + ' ' + args[1]!.join(' ')
      const errorMessage = `Command failed: ${command}\n\n${red(result.output)}`
      throw new Error(errorMessage)
    } else {
      return result.output
    }
  }

  return Object.assign(throwOnFailure, { allowFailure })
}

function createScopedExec({
  dir,
}: {
  dir: string
}): (command: string) => ReturnType<ReturnType<typeof createScopedSpawn>> {
  return createScopedSpawn({ dir, shell: true })
}

export function describeIntegrationTest(
  name: string,
  test: (props: {
    spawn: ReturnType<typeof createScopedSpawn>
    exec: ReturnType<typeof createScopedExec>
    dir: string
    gudetama: string
    writeConfig: (config: Omit<ConfigFile, 'getObjectStore'>) => void
  }) => void
) {
  describe(name, () => {
    const rootDir = path.join(os.tmpdir(), 'gudetama-test', slugify(name))
    for (const type of ['npm', 'bundle']) {
      describe(`[${type}]`, () => {
        const dir = path.join(rootDir, type)
        spawnSync('mkdir', ['-p', dir])
        test({
          spawn: createScopedSpawn({ dir }),
          exec: createScopedExec({ dir }),
          dir,
          gudetama: path.resolve(`test-bin/gudetama-test-${type}`),
          writeConfig: (file) =>
            writeFileSync(
              path.join(dir, 'gudetama.config.js'),
              `module.exports = ${JSON.stringify(file, null, '  ')}`
            ),
        })
      })
    }
    afterAll(() => {
      rimraf.sync(rootDir)
    })
  })
}
