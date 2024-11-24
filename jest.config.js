module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@logger$': '<rootDir>/src/shared/lib/logger.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
