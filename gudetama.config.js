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
      inputCommands: ['yarn --version', 'node --version'],
      inputFiles: {
        include: ['yarn.lock', 'package.json'],
      },
      outputFiles: ['node_modules'],
    },
    'build-bundle': {
      command: 'yarn build-bundle',
      inputCommands: ['yarn --version', 'node --version'],
      inputFiles: {
        extends: ['install-node-modules'],
        include: ['src'],
      },
      outputFiles: ['gudetama.v*.js']
    },
    'build-npm': {
      command: 'yarn build-npm',
      inputCommands: ['yarn --version', 'node --version'],
      inputFiles: {
        extends: ['install-node-modules'],
        include: ['src/**/*'],
      },
      outputFiles: ['lib']
    },
    test: {
      command: 'mkdir -p .test && echo banana > .test/bananas',
      inputFiles: {
        include: ['package.json'],
      },
      outputFiles: ['node_modules/lodash'],
      inputCommands: ['yarn --version', 'node --version'],
      branches: {
        never: ['jussie smolet'],
      },
    },
  },
}

module.exports = config
