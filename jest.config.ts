import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/unit/lib/**/*.test.ts',
        '<rootDir>/__tests__/unit/repositories/**/*.test.ts',
        '<rootDir>/__tests__/integration/**/*.test.ts',
      ],
      transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/unit/components/**/*.test.tsx',
        '<rootDir>/__tests__/unit/hooks/**/*.test.ts',
      ],
      transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^lightweight-charts$': '<rootDir>/__mocks__/lightweight-charts.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
    '!src/app/page.tsx',        // E2E tested
    '!src/app/error.tsx',       // trivial UI
    '!src/app/loading.tsx',     // trivial UI
    '!src/app/api/**/route.ts', // tested via service layer
    '!src/lib/db.ts',           // infrastructure singleton, tested via repository tests
    '!src/lib/seed.ts',         // startup script, tested via E2E
  ],
  coverageThreshold: { global: { lines: 80, functions: 80, branches: 70, statements: 80 } },
}

export default createJestConfig(config)
