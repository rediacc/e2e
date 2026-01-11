import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { TestDataManager } from '../../src/utils/data/TestDataManager';

test.describe('Team Edit Tests', () => {
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

    test('should edit team name and view members @system @organization @teams @regression', async ({
        page,
        screenshotManager,
        testReporter
    }) => {
        const stepNavigate = await testReporter.startStep('Navigate to Organization Users section');

        // Get created user
        const createdUser = testDataManager.getCreatedUser();

        // Navigate to users
        await page.getByTestId('sidebar-submenu-organization-users').click();
        await expect(page.getByRole('cell', { name: `user ${createdUser.email}` })).toBeVisible();

        await testReporter.completeStep('Navigate to Organization Users section', 'passed');

        const stepEditTeam = await testReporter.startStep('Edit team name and view members');

        await page.getByTestId('system-team-edit-button-test-TEAM').click();
        await page.getByTestId('resource-modal-field-teamName-input').click();
        await page.getByTestId('resource-modal-field-teamName-input').fill('test-TEAM-2');
        await page.getByTestId('resource-modal-ok-button').click();
        await page.getByTestId('system-team-members-button-test-TEAM-2').click();

        await testReporter.completeStep('Edit team name and view members', 'passed');

        await testReporter.finalizeTest();
    });
});
