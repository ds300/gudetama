/**
 * @type {import('./src/config').ConfigFile}
 */
const config = {
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
      command: 'mkdir -p .test && echo banana > .test/banana && cat .test/banana',
      inputFiles: {
        include: ['package.json'],
      },
      artifacts: ['.test'],
    },
  },
}

module.exports = config
