import * as test from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default test.defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: (() => {
      if (process.env.BASE_URL) {
        return process.env.BASE_URL;
      } else {
        throw new Error('BASE_URL environment variable is required');
      }
    })() + '/console/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: process.env.SCREENSHOT_ON_FAILURE === 'true' ? 'only-on-failure' : 'off',
    
    /* Video settings */
    video: (() => {
      if (process.env.RECORD_VIDEO) {
        return process.env.RECORD_VIDEO as any;
      } else {
        return 'off';
      }
    })(),
    
    /* Timeout settings */
    actionTimeout: (() => {
      if (process.env.API_TIMEOUT) {
        return parseInt(process.env.API_TIMEOUT);
      } else {
        throw new Error('API_TIMEOUT environment variable is required');
      }
    })(),
    navigationTimeout: (() => {
      if (process.env.PAGE_TIMEOUT) {
        return parseInt(process.env.PAGE_TIMEOUT);
      } else {
        throw new Error('PAGE_TIMEOUT environment variable is required');
      }
    })(),
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...test.devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...test.devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...test.devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
