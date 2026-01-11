import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { TestDataManager } from '../../src/utils/data/TestDataManager';

test.describe('Team Creation Tests', () => {
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

    test('should create new team with permissions @system @organization @teams @regression', async ({
        page,
        screenshotManager,
        testReporter
    }) => {
        const stepNavigate = await testReporter.startStep('Navigate to Organization Users section');

        await page.getByTestId('sidebar-submenu-organization-teams').click();
        await page.getByTestId('system-create-team-button').click();
        await page.getByTestId('resource-modal-field-teamName-input').click();

        await page.getByTestId('resource-modal-field-teamName-input').fill('test-TEAM');
        await page.getByTestId('vault-editor-generate-SSH_PRIVATE_KEY').click();
        await page.getByTestId('vault-editor-generate-button').click();
        await page.getByTestId('vault-editor-apply-generated').click();
        await page.getByTestId('resource-modal-ok-button').click();

        await testReporter.completeStep('Create new team', 'passed');

        await testReporter.finalizeTest();
    });
});
