/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testMatch: ['**/*.test.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
}
