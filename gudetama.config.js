/**
 * @type {import('./src/config').ConfigFile}
 */
const config = {
  cacheVersion: 1,
  steps: {
    'yarn install': {
      inputFiles: {
        include: ['yarn.lock'],
      },
      artifacts: ['node_modules/chalk'],
    },
    'yarn test': {
      inputFiles: {
        include: ['lib/**/*'],
      },
    },
    test: {
      command:
        'mkdir -p .test && echo banana > .test/bananas && cat .test/banana',
      inputFiles: {
        include: ['package.json'],
      },
      inputCommands: ['yarn --version', 'node --version'],
      artifacts: ['.test'],
    },
  },
}

module.exports = config
