// Browser checks against the production build served with the same rewrites
// and security headers as vercel.json (scripts/serve-dist.js), plus the API
// without a database (bundled catalogue, preview shop).
//   npm run build && npm run test:e2e
import { defineConfig, devices } from '@playwright/test';

const WEB = 4310;
const API = 3310;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB}`,
    trace: 'off',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node server/index.js',
      url: `http://127.0.0.1:${API}/api/health`,
      env: {
        NODE_ENV: 'test',
        PORT: String(API),
        HOST: '127.0.0.1',
        FRONTEND_URL: `http://127.0.0.1:${WEB}`,
        LOG_LEVEL: 'silent',
      },
      reuseExistingServer: false,
    },
    {
      command: `node scripts/serve-dist.js --port ${WEB} --api http://127.0.0.1:${API}`,
      url: `http://127.0.0.1:${WEB}/`,
      reuseExistingServer: false,
    },
  ],
});
