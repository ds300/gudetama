import { runIntegrationTest } from './runIntegrationTest'
import { defaultConfig } from './defaultConfig'
import { readFileSync, unlinkSync } from 'fs-extra'
import { join } from 'path'

runIntegrationTest(
  'Branch filtering',
  ({ exec, writeConfig, gudetama, dir }) => {
    describe('current branch detection', () => {
      it(`picks up the current branch from git repo`, async () => {
        exec('git init')
        exec('git checkout -b my-special-branch')
        exec('git commit --allow-empty -m message')
        writeConfig({
          ...defaultConfig,
          steps: {
            'write-artifact': {
              command: 'echo "I am the artifact" > artifact.txt',
              branches: {
                only: ['my-special-branch'],
              },
            },
          },
        })
        expect(exec(`${gudetama} run-if-needed write-artifact`)).not.toMatch(
          "Skipping 'write-artifact'"
        )
        expect(readFileSync(join(dir, 'artifact.txt')).toString()).toBe(
          'I am the artifact\n'
        )
        unlinkSync(join(dir, 'artifact.txt'))
        exec('git checkout -b a-different-branch')
        expect(exec(`${gudetama} run-if-needed write-artifact`)).toMatch(
          "Skipping 'write-artifact' because this is the a-different-branch branch"
        )
      })

      it(`can override current branch in config`, async () => {
        writeConfig({
          ...defaultConfig,
          currentBranch: 'overridden-branch',
          steps: {
            'write-artifact': {
              command: 'echo "I am the artifact" > artifact.txt',
              branches: {
                only: ['my-special-branch'],
              },
            },
          },
        })
        expect(exec(`${gudetama} run-if-needed write-artifact`)).toMatch(
          "Skipping 'write-artifact' because this is the overridden-branch branch"
        )
      })
    })

    describe('only semantics', () => {
      it(`only`, async () => {})
    })
  }
)
