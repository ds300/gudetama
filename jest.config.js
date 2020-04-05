module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['src/**/*.test.{js,ts}', 'integration-tests/**/*.test.{js,ts}'],
  cacheDirectory: '.jest/cache',
  transform: {
    '.*(ts|tsx|js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/.*'],
}
