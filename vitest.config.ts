import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: [
      'tests/e2e/**',
      'tests/e2e-admin/**',
      'tests/stress/**',
      'node_modules/**',
      'dist/**',
    ],
  },
})