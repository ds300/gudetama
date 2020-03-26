// @ts-check
/**
 * @type {import('./lib/config').ConfigFile}
 */
const config = {
  steps: {
    'yarn install': {
      inputFiles: {
        include: ['yarn.lock'],
      },
      artifacts: ['node_modules'],
    },
    'yarn test': {
      inputFiles: {
        include: ['lib/**/*'],
      }
    },
  },
}

module.exports = config
