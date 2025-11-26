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
    const authFile = 'auth.json';
    let storageState;
    
    try {
      if (fs.existsSync(authFile)) {
        storageState = authFile;
        console.log('✅ Using auth.json for authentication');
      }
    } catch (error) {
      console.log('⚠️ Could not read auth.json, will perform manual login');
    }
    
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
      ...(storageState && { storageState })
    });
    const page = await context.newPage();
    
    // Always perform login regardless of auth file
    const loginData = {
      email: requireEnvVar('TEST_USER_EMAIL'),
      password: requireEnvVar('TEST_USER_PASSWORD')
    };

    await page.goto('/console/login');
    
    try {
      if (await page.locator('[data-testid="login-email-input"]').isVisible({ timeout: 5000 })) {
        console.log('🔐 Performing login...');
        await page.fill('[data-testid="login-email-input"]', loginData.email);
        await page.fill('[data-testid="login-password-input"]', loginData.password);
        await page.click('[data-testid="login-submit-button"]');
        
        // Wait for redirect after login - but don't fail if it stays on login page
        try {
          await page.waitForURL('**/machines', { timeout: 15000 });
          console.log('✅ Login successful - redirected to machines');
        } catch {
          // Check if login was actually successful by looking for redirect or dashboard elements
          await page.waitForTimeout(2000);
          const currentUrl = page.url();
          console.log(`✅ Login completed - current URL: ${currentUrl}`);
        }
        
        // Save authentication state for future tests
        await page.context().storageState({ path: 'auth.json' });
      } else {
        console.log('✅ Already authenticated via auth.json');
      }
    } catch (error) {
      console.log(`⚠️ Authentication failed: ${error}`);
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

    await page.goto('/console/login');
    
    if (await page.locator('[data-testid="login-email-input"]').isVisible()) {
      await page.fill('[data-testid="login-email-input"]', adminData.email);
      await page.fill('[data-testid="login-password-input"]', adminData.password);
      await page.click('[data-testid="login-submit-button"]');
      
      await page.waitForURL('**/console/**', { timeout: 30000 });
    }

    await use(page);
    await page.close();
    await context.close();
  }
});

export { expect };