import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 300_000, // 5 minutes — needed for slow-motion demo recordings
  // Match both existing CDSS and new LIMS spec files
  testMatch: ['cdss-alert.spec.ts', 'lims-happy-path.spec.ts'],
  use: {
    baseURL: 'http://localhost:54321',
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    screenshot: 'on',
    viewport: { width: 1920, height: 1080 },
    trace: 'on',
    launchOptions: {
      slowMo: 1500, // 每個動作放慢 1.5 秒，讓畫面清晰可見
      args: [
        '--window-size=1920,1080',
        '--force-device-scale-factor=1',
      ],
    },
  },
  webServer: {
    command: 'npm run dev',
    port: 54321,
    reuseExistingServer: true,
  },
  reporter: [['html', { outputFolder: 'playwright-report' }]],
});

