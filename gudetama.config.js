// @ts-check
/**
 * @type {import('@artsy/gudetama').ConfigFile<'install-node-modules' | 'type-check' | 'build-bundle' | 'build-npm' | 'prepare-tests' | 'test'>}
 */
const config = {
  repoID: 'gudetama',
  cacheVersion: 1,
  steps: {
    'install-node-modules': {
      command: 'yarn',
      inputs: {
        commands: ['yarn --version', 'node --version'],
        files: {
          include: ['yarn.lock', 'package.json'],
        },
      },

      outputFiles: ['node_modules'],
    },
    'type-check': {
      command: 'yarn tsc',
      inputs: {
        extends: ['install-node-modules'],
        files: {
          include: [
            'src',
            'integration-tests',
            'scripts',
            'typings',
            'tsconfig.json',
          ],
        },
      },
    },
    'build-bundle': {
      command: 'yarn build-bundle',
      inputs: {
        extends: ['install-node-modules'],
        files: {
          include: [
            'src',
            'rollup.config.js',
            'tsconfig.json',
            'babel.config.js',
          ],
          exclude: ['src/**/*.test.ts'],
        },
      },
      outputFiles: ['gudetama.v*.js'],
    },
    'build-npm': {
      command: 'yarn build-npm',
      inputs: {
        extends: ['install-node-modules'],
        files: {
          include: ['src', 'tsconfig*', 'babel.config.js'],
          exclude: ['src/**/*.test.ts'],
        },
      },
      outputFiles: ['lib'],
    },
    'prepare-tests': {
      command: './scripts/prepare-tests.sh',
      inputs: {
        extends: ['build-bundle', 'build-npm'],
        files: {
          include: ['scripts'],
        },
      },
      outputFiles: ['test-bin'],
    },
    test: {
      command: 'yarn test',
      inputs: {
        extends: ['prepare-tests'],
        files: {
          include: ['jest.config.js', 'integration-tests', 'src/**/*.test.ts'],
        },
      },
    },
  },
}

module.exports = config
