module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  testMatch: [
    '<rootDir>/src/**/*.test.{js,ts}',
    '<rootDir>/integration-tests/**/*.test.{js,ts}',
  ],
  cacheDirectory: '.jest/cache',
  transform: {
    '.*(ts|tsx|js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/.*'],
}
