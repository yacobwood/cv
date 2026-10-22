import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
});
