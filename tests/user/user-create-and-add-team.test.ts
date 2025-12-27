import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { LoginPage } from '../../pages/auth/LoginPage';

test.describe('User Create Tests', () => {
    let dashboardPage: DashboardPage;
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new DashboardPage(page);
        
        await loginPage.navigate();
        await loginPage.performQuickLogin();
    });

    test('new user create and assign new team', async ({
        page,
        screenshotManager,
        testReporter
    }) => {
        const userTempNew = `testuser-new+${Date.now()}@rediacc.io`;

        await testReporter.startStep('Navigate to Users');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.getByText('Organization').click();
        await page.getByLabel('Main navigation').getByText('Users').click();
        await screenshotManager.captureStep('01_users_list');
        await testReporter.completeStep('Navigate to Users', 'passed');

        await testReporter.startStep('Create new user');
        await page.getByTestId('system-create-user-button').click();
        await page.getByTestId('resource-form-field-newUserEmail').fill(userTempNew);
        await page.getByTestId('resource-form-field-newUserPassword').fill('testuser');
        await screenshotManager.captureStep('02_user_form_filled');
        await page.getByTestId('resource-form-submit-button').click();
        await page.getByText(`User "${userTempNew}"`).click();
        await testReporter.completeStep('Create new user', 'passed');

        await testReporter.startStep('Activate user');
        const activateButton = page.getByTestId(`system-user-activate-button-${userTempNew}`);
        await expect(activateButton).toBeVisible();
        await activateButton.click();
        await page.getByRole('button', { name: 'general.yes' }).click();
        await page.waitForTimeout(1000);
        await screenshotManager.captureStep('03_user_activated');
        await expect(page.getByText(`${userTempNew}`)).toBeVisible();
        await testReporter.completeStep('Activate user', 'passed');

        await testReporter.startStep('Add user to Private Team');
        await page.getByText('Teams').click();
        await page.getByTestId('system-team-members-button-Private Team').click();
        await page.getByRole('tab', { name: 'Add Member' }).click();
        const memberSelect = page.locator('#rc_select_4');
        await memberSelect.click();
        await memberSelect.fill(userTempNew);
        await page.getByText(userTempNew).nth(1).click();
        await memberSelect.click();
        await screenshotManager.captureStep('04_member_added');
        await expect(page.getByText(`User "${userTempNew}"`)).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).click();
        await testReporter.completeStep('Add user to Private Team', 'passed');

        await testReporter.startStep('Verify user in team');
        await page.getByTestId('system-team-members-button-Private Team').click();
        await page.getByRole('tab', { name: 'Current Members' }).click();
        const userHeading = page.getByRole('heading', { name: userTempNew });
        await userHeading.first().scrollIntoViewIfNeeded();
        await expect(userHeading).toBeVisible();
        await screenshotManager.captureStep('05_member_verified');
        await testReporter.completeStep('Verify user in team', 'passed');

        await testReporter.finalizeTest();
    });
});