import * as test from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Playwright configuration for bridge/renet tests.
 * These tests don't require a browser - they test CLI and SSH operations.
 *
 * Infrastructure is auto-provisioned via globalSetup if not already running.
 * Test outputs are saved to reports/ folder (gitignored).
 */
export default test.defineConfig({
  testDir: './tests/bridge',
  /* Global setup ensures infrastructure is running */
  globalSetup: require.resolve('./src/base/bridge-global-setup'),
  globalTeardown: require.resolve('./src/base/bridge-global-teardown'),
  /* Run tests in files sequentially to preserve ordering in reports */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Single worker for bridge tests to avoid conflicts */
  workers: 1,
  /* Longer timeout for SSH operations */
  timeout: 120000,
  /* Reporters: HTML report + text file output for each test */
  reporter: [
    ['html', { outputFolder: 'reports/bridge' }],
    ['./src/reporters/TextFileReporter.ts', { outputDir: 'reports/bridge-logs' }],
  ],
  /* No browser needed for bridge tests */
  use: {
    /* No baseURL needed */
  },
  /* Single project - no browser needed */
  projects: [
    {
      name: 'bridge',
      testMatch: '**/*.test.ts',
    },
  ],
});
