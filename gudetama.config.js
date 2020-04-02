// @ts-check
/**
 * @type {import('@artsy/gudetama').ConfigFile}
 */
const config = {
  repoID: 'gudetama',
  cacheVersion: 1,
  steps: {
    install_node_modules: {
      command: 'yarn',
      inputFiles: {
        include: ['yarn.lock'],
      },
      outputFiles: ['node_modules'],
    },
    'yarn test': {
      inputFiles: {
        include: ['lib/**/*'],
      },
    },
    test: {
      command: 'mkdir -p .test && echo banana > .test/bananas',
      inputFiles: {
        include: ['package.json'],
      },
      outputFiles: ['node_modules'],
      inputCommands: ['yarn --version', 'node --version'],
      branches: {
        never: ['jussie smolet'],
      },
    },
  },
}

module.exports = config
