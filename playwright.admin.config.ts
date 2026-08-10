import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e-admin',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 5174',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://cartamago-e2e.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'cartamago-e2e-anon-key',
      VITE_BRANCH_ID: 'brasas-sazon',
      VITE_MENU_STORAGE_BUCKET: 'menu-assets',
      VITE_E2E_ADMIN_MOCK: 'true',
    },
  },
  projects: [
    {
      name: 'admin-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'admin-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
