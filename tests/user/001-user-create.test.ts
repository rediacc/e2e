import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { TestDataManager } from '../../src/utils/data/TestDataManager';

test.describe('User Creation Tests', () => {
    let dashboardPage: DashboardPage;
    let loginPage: LoginPage;
    let testDataManager: TestDataManager;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new DashboardPage(page);
        testDataManager = new TestDataManager();

        await loginPage.navigate();
        await loginPage.performQuickLogin();
        await dashboardPage.waitForNetworkIdle();
    });

    test('should create and activate new user @system @users @regression', async ({
        page,
        screenshotManager,
        testReporter
    }) => {
        // Generate unique user email
        const tempUser = testDataManager.getUser('tempuser');
        const newUserEmail = tempUser.email;
        const newUserPassword = tempUser.password;

        const stepNavigate = await testReporter.startStep('Navigate to Users section');

        // Navigate to Organization > Users
        await page.getByText('Organization').click();
        await page.getByLabel('Main navigation').getByText('Users').click();

        // Wait for user table to be visible
        const userTable = page.getByTestId('resource-list-table');
        await expect(userTable).toBeVisible({ timeout: 10000 });

        await testReporter.completeStep('Navigate to Users section', 'passed');

        const stepCreateUser = await testReporter.startStep('Create new user');

        // Click create user button
        const createUserButton = page.getByTestId('system-create-user-button');
        await expect(createUserButton).toBeVisible({ timeout: 5000 });
        await createUserButton.click();

        // Fill user form
        const emailField = page.getByTestId('resource-form-field-newUserEmail');
        const passwordField = page.getByTestId('resource-form-field-newUserPassword');

        await expect(emailField).toBeVisible();
        await expect(passwordField).toBeVisible();

        await emailField.fill(newUserEmail);
        await passwordField.fill(newUserPassword);

        // Submit form
        const submitButton = page.getByTestId('resource-form-submit-button');
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        // Verify user created message
        await expect(page.getByText(`User "${newUserEmail}"`)).toBeVisible({ timeout: 5000 });

        // Save user to test data
        testDataManager.addCreatedUser(newUserEmail, newUserPassword, false);

        await testReporter.completeStep('Create new user', 'passed');

        await testReporter.finalizeTest();
    });
});
