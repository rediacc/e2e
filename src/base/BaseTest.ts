import { test as baseTest, expect, Page, BrowserContext } from '@playwright/test';
import { ScreenshotManager } from '../utils/screenshot/ScreenshotManager';
import { TestReporter } from '../utils/report/TestReporter';
import { TestDataManager } from '../utils/data/TestDataManager';
import { requireEnvVar } from '../utils/env';
import fs from 'fs';

export interface TestFixtures {
  screenshotManager: ScreenshotManager;
  testReporter: TestReporter;
  testDataManager: TestDataManager;
  authenticatedPage: Page;
  adminPage: Page;
}

export const test = baseTest.extend<TestFixtures>({

  screenshotManager: async ({ page }, use, testInfo) => {
    const screenshotManager = new ScreenshotManager(page, testInfo);
    await use(screenshotManager);
  },

  testReporter: async ({ page }, use, testInfo) => {
    const testReporter = new TestReporter(page, testInfo);
    await use(testReporter);
  },

  testDataManager: async ({}, use) => {
    const testDataManager = new TestDataManager();
    await use(testDataManager);
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page = await context.newPage();

    const loginData = {
      email: requireEnvVar('TEST_USER_EMAIL'),
      password: requireEnvVar('TEST_USER_PASSWORD')
    };

    // Navigate to machines page directly - will redirect to login if not authenticated
    await page.goto('/console/machines');

    // Check if we're on the login page (need to authenticate)
    const isLoginPage = await page.locator('[data-testid="login-email-input"]').isVisible({ timeout: 3000 }).catch(() => false);

    if (isLoginPage) {
      console.log('🔐 Performing login...');
      await page.fill('[data-testid="login-email-input"]', loginData.email);
      await page.fill('[data-testid="login-password-input"]', loginData.password);
      await page.click('[data-testid="login-submit-button"]');

      // Wait for redirect to machines page
      await page.waitForURL('**/machines', { timeout: 15000 });
      console.log('✅ Login successful - redirected to machines');
    } else {
      console.log('✅ Already authenticated');
    }

    // Verify we're on an authenticated page (not login)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Authentication failed - still on login page: ${currentUrl}`);
    }

    await use(page);
    await page.close();
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page = await context.newPage();

    const adminData = {
      email: requireEnvVar('SYSTEM_ADMIN_EMAIL'),
      password: requireEnvVar('SYSTEM_ADMIN_PASSWORD')
    };

    // First navigate to set localStorage (expert mode) before auth
    await page.goto('/console/login');

    // Enable expert mode before authentication
    await page.evaluate(() => {
      localStorage.setItem('uiMode', 'expert');
    });

    // Now perform login
    const isLoginPage = await page.locator('[data-testid="login-email-input"]').isVisible({ timeout: 3000 }).catch(() => false);

    if (isLoginPage) {
      console.log('🔐 Admin login - performing login with expert mode...');
      await page.fill('[data-testid="login-email-input"]', adminData.email);
      await page.fill('[data-testid="login-password-input"]', adminData.password);
      await page.click('[data-testid="login-submit-button"]');

      // Wait for redirect to machines page
      await page.waitForURL('**/machines', { timeout: 30000 });
      console.log('✅ Admin login successful - redirected to machines (expert mode enabled)');
    } else {
      console.log('✅ Admin already authenticated');
    }

    // Verify we're on an authenticated page (not login)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Admin authentication failed - still on login page: ${currentUrl}`);
    }

    // Wait for the page to be fully loaded before use
    await page.waitForLoadState('networkidle');

    await use(page);
    await page.close();
    await context.close();
  }
});

export { expect };