import { spawnSync } from 'child_process'
import slugify from '@sindresorhus/slugify'
import os from 'os'
import path from 'path'
import rimraf from 'rimraf'

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

function createScopedExec(dir: string) {
  return (command: string, args?: string[]): ExecResult => {
    const result = spawnSync(command, args, { cwd: dir })
    if (result.error) {
      console.error(result.error)
      throw new Error(`Failed to execute '${command} ${args?.join(' ') || ''}'`)
    }
    if (result.status === 0) {
      return {
        type: 'success',
        output: result.stdout.toString().trim(),
      }
    } else {
      return {
        type: 'failure',
        output: result.stderr.toString().trim(),
        status: result.status!,
      }
    }
  }
}

export function runIntegrationTest(
  name: string,
  test: (props: {
    exec: ReturnType<typeof createScopedExec>
    dir: string
    gudetama: string
  }) => void
) {
  describe(name, () => {
    const rootDir = path.join(os.tmpdir(), 'gudetama-test', slugify(name))
    describe(`[npm]`, () => {
      const dir = path.join(rootDir, 'npm')
      spawnSync('mkdir', ['-p', dir])
      test({
        exec: createScopedExec(dir),
        dir,
        gudetama: path.resolve('test-bin/gudetama-test-npm'),
      })
    })

    describe(`[bundle]`, () => {
      const dir = path.join(rootDir, 'npm')
      spawnSync('mkdir', ['-p', dir])
      test({
        exec: createScopedExec(dir),
        dir,
        gudetama: path.resolve('test-bin/gudetama-test-bundle'),
      })
    })
    afterAll(() => {
      rimraf.sync(rootDir)
    })
  })
}
