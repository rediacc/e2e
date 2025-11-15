import { test as baseTest, expect, Page, BrowserContext } from '@playwright/test';
import { ScreenshotManager } from '../utils/screenshot/ScreenshotManager';
import { TestReporter } from '../utils/report/TestReporter';
import { TestDataManager } from '../utils/data/TestDataManager';
import { requireEnvVar } from '../utils/env';

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

    await page.goto('/login');
    
    if (await page.locator('[data-testid="email-input"]').isVisible()) {
      await page.fill('[data-testid="email-input"]', loginData.email);
      await page.fill('[data-testid="password-input"]', loginData.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('**/dashboard', { timeout: 30000 });
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
      email: requireEnvVar('ADMIN_USER_EMAIL'),
      password: requireEnvVar('ADMIN_USER_PASSWORD')
    };

    await page.goto('/console/login');
    
    if (await page.locator('[data-testid="email-input"]').isVisible()) {
      await page.fill('[data-testid="email-input"]', adminData.email);
      await page.fill('[data-testid="password-input"]', adminData.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('**/dashboard', { timeout: 30000 });
    }

    await use(page);
    await page.close();
    await context.close();
  }
});

export { expect };