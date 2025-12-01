import { test as setup } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { requireEnvVar } from '../../src/utils/env';

const authFile = 'auth.json';

setup('authenticate as standard user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.navigate();
  
  const email = requireEnvVar('TEST_USER_EMAIL');
  const password = requireEnvVar('TEST_USER_PASSWORD');
  
  await loginPage.login(email, password);
  await page.waitForURL('**/machines', { timeout: 30000 });
  
  await page.context().storageState({ path: authFile });
});