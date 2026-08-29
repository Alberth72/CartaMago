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
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/unit',
      include: ['src/**/*.{ts,tsx}', 'apps/api/src/**/*.ts'],
      exclude: [
        'src/main.tsx',
        'src/index.css',
        'tests/**',
        'dist/**',
        'dist-api/**',
        'node_modules/**',
        '**/*.test.{ts,tsx}',
      ],
      reporter: ['text', 'json', 'html'],
      reportOnFailure: true,
    },
  },
})