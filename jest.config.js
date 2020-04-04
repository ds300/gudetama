module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['<rootDir>/src/**/__tests__/*tests.(ts|tsx|js)'],
  cacheDirectory: '.jest/cache',
  transform: {
    '.*(ts|tsx|js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/.*'],
}
