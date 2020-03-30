// @ts-check
/**
 * @type {import('./src/config').ConfigFile}
 */
const config = {
  cacheVersion: 1,
  steps: {
    install_node_modules: {
      command: 'yarn',
      inputFiles: {
        include: ['yarn.lock'],
      },
      artifacts: ['node_modules'],
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
      inputCommands: ['yarn --version', 'node --version'],
      artifacts: ['.test'],
      branches: {
        never: ['jussie smolet'],
      },
    },
  },
}

module.exports = config
