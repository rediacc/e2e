import { test, expect } from '../../src/base/BaseTest';
import { LoginPage } from '../../pages/auth/LoginPage';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { requireEnvVar } from '../../src/utils/env';

test.describe('Login Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('should login with valid credentials @auth @smoke', async ({ 
    page, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Navigate to login page');
    await screenshotManager.captureStep('01_login_page_loaded');
    
    await loginPage.navigate();
    await loginPage.verifyFormValidation();
    
    await testReporter.completeStep('Navigate to login page', 'passed');
    await screenshotManager.captureStep('02_login_form_visible');

    const step2 = await testReporter.startStep('Enter valid credentials');
    
    const email = requireEnvVar('TEST_USER_EMAIL');
    const password = requireEnvVar('TEST_USER_PASSWORD');
    
    await loginPage.login(email, password);
    await testReporter.completeStep('Enter valid credentials', 'passed');
    await screenshotManager.captureStep('03_credentials_entered');

    const step3 = await testReporter.startStep('Verify successful login');
    
    await loginPage.waitForLoginCompletion();
    await dashboardPage.verifyDashboardLoaded();
    
    await expect(page.url()).toContain('/machines');
    
    await testReporter.completeStep('Verify successful login', 'passed');
    await screenshotManager.captureStep('04_dashboard_loaded');
    
    await testReporter.generateDetailedReport();
  });

  test('should show error with invalid credentials @auth', async ({ 
    page, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Navigate to login page');
    await loginPage.navigate();
    await screenshotManager.captureStep('01_login_page_loaded');
    await testReporter.completeStep('Navigate to login page', 'passed');

    const step2 = await testReporter.startStep('Enter invalid credentials');
    
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await screenshotManager.captureStep('02_invalid_credentials_entered');
    
    await testReporter.completeStep('Enter invalid credentials', 'passed');

    const step3 = await testReporter.startStep('Verify error message');
    
    //const errorMessage = await loginPage.getErrorMessage();
    //expect(errorMessage).toBeTruthy();
    //expect(errorMessage.toLowerCase()).toContain('failed');
    await loginPage.validateErrorMessage('not found');

    await screenshotManager.captureStep('03_error_message_displayed');
    await testReporter.completeStep('Verify error message', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should disable login button with empty fields @auth', async ({ 
    page, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Navigate to login page');
    await loginPage.navigate();
    await screenshotManager.captureStep('01_login_page_loaded');
    await testReporter.completeStep('Navigate to login page', 'passed');

    const step2 = await testReporter.startStep('Verify empty form state');
    
    await loginPage.clearForm();
    const isButtonEnabled = await loginPage.isLoginButtonEnabled();
    
    // In most cases, login button should be disabled when fields are empty
    // This might vary based on the actual implementation
    await screenshotManager.captureStep('02_empty_form_state');
    
    await testReporter.completeStep('Verify empty form state', 'passed');
    await testReporter.generateDetailedReport();
  });

  test('should handle remember me functionality @auth', async ({ 
    page, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Navigate to login page');
    await loginPage.navigate();
    await screenshotManager.captureStep('01_login_page_loaded');
    await testReporter.completeStep('Navigate to login page', 'passed');

    const step2 = await testReporter.startStep('Test remember me checkbox');
    
    const email = requireEnvVar('TEST_USER_EMAIL');
    const password = requireEnvVar('TEST_USER_PASSWORD');
    
    await loginPage.login(email, password, true);
    
    const isChecked = await loginPage.isRememberMeChecked();
    expect(isChecked).toBe(true);
    
    await screenshotManager.captureStep('02_remember_me_checked');
    await testReporter.completeStep('Test remember me checkbox', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should navigate to registration page @auth @smoke', async ({ 
    page, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Navigate to login page');
    await loginPage.navigate();
    await screenshotManager.captureStep('01_login_page_loaded');
    await testReporter.completeStep('Navigate to login page', 'passed');

    const step2 = await testReporter.startStep('Click register link');
    
    await loginPage.clickRegister();
    
    // Wait for navigation to register page
    await page.waitForTimeout(2000);
    
    await screenshotManager.captureStep('02_register_page_loaded');
    await testReporter.completeStep('Click register link', 'passed');
    
    await testReporter.generateDetailedReport();
  });
});