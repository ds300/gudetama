// @ts-check
/**
 * @type {import('@artsy/gudetama').ConfigFile}
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
    'build-bundle': {
      command: 'yarn build-bundle',
      inputs: {
        extends: ['install-node-modules'],
        files: {
          include: ['src', 'rollup.config.js', 'tsconfig*', 'babel.config.js'],
        },
      },
      outputFiles: ['gudetama.v*.js'],
    },
    'build-npm': {
      command: 'yarn build-npm',
      inputs: {
        extends: ['install-node-modules'],
        files: {
          include: ['src/**/*', 'tsconfig*', 'babel.config.js'],
        },
      },
      outputFiles: ['lib'],
    },
    'prepare-tests': {
      command: './scripts/prepare-tests.sh',
      inputs: {
        extends: ['build-bundle', 'build-npm'],
      },
      outputFiles: ['test-bin'],
    },
  },
}

module.exports = config
