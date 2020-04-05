import { spawnSync, execSync } from 'child_process'
import { writeFileSync, readFileSync, statSync } from 'fs-extra'
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
        status: result.status,
      }
    }
  }
}

const EXECUTABLE = 33261

export function runIntegrationTest(
  name,
  test: (props: {
    exec: ReturnType<typeof createScopedExec>
    dir: string
  }) => void
) {
  describe(name, () => {
    const rootDir = path.join(os.tmpdir(), 'gudetama-test', slugify(name))
    describe(`[npm]`, () => {
      writeFileSync(
        'test-bin/gudetama',
        readFileSync('test-bin/gudetama-test-npm').toString(),
        { mode: EXECUTABLE }
      )
      const dir = path.join(rootDir, 'npm')
      spawnSync('mkdir', ['-p', dir])
      test({ exec: createScopedExec(dir), dir })
    })

    describe(`[bundle]`, () => {
      writeFileSync(
        'test-bin/gudetama',
        readFileSync('test-bin/gudetama-test-bundle').toString(),
        { mode: EXECUTABLE }
      )
      const dir = path.join(rootDir, 'npm')
      spawnSync('mkdir', ['-p', dir])
      test({ exec: createScopedExec(dir), dir })
    })
    afterAll(() => {
      rimraf.sync(rootDir)
    })
  })
}
