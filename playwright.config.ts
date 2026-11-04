import { defineConfig, devices } from '@playwright/test';

const raw = process.env.BASE_PATH ?? '/portfolio/';
const base = '/' + raw.replace(/^\/+|\/+$/g, '') + '/';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45000,
  retries: 1,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173' + (base === '//' ? '/' : base),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173' + (base === '//' ? '/' : base),
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
