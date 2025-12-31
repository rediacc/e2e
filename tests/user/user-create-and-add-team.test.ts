import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { LoginPage } from '../../pages/auth/LoginPage';

test.describe('User Create and Team Assignment Tests', () => {
    let dashboardPage: DashboardPage;
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new DashboardPage(page);
        
        await loginPage.navigate();
        await loginPage.performQuickLogin();
        await dashboardPage.waitForNetworkIdle();
    });

    test('should create new user and assign to team @system @users @regression', async ({
        page,
        screenshotManager,
        testReporter
    }) => {
        // Generate unique user email
        const newUserEmail = `testuser-${Date.now()}@rediacc.io`;
        const newUserPassword = 'testuser123';
        const teamName = 'Private Team';

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
        
        await testReporter.completeStep('Create new user', 'passed');

        const stepActivateUser = await testReporter.startStep('Activate user');

        // Find and click activate button
        const activateButton = page.getByTestId(`system-user-activate-button-${newUserEmail}`);
        await expect(activateButton).toBeVisible({ timeout: 5000 });
        await activateButton.click();

        // Confirm activation in modal
        const confirmButton = page.getByRole('button', { name: 'general.yes' });
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();

        // Verify user is activated (deactivate button should now be visible)
        const deactivateButton = page.getByTestId(`system-user-deactivate-button-${newUserEmail}`);
        await expect(deactivateButton).toBeVisible({ timeout: 5000 });
        
        await testReporter.completeStep('Activate user', 'passed');

        const stepAddToTeam = await testReporter.startStep('Add user to team');

        // Navigate to Teams
        await page.getByText('Teams').click();
        
        // Open team members dialog
        const teamMembersButton = page.getByTestId(`system-team-members-button-${teamName}`);
        await expect(teamMembersButton).toBeVisible({ timeout: 5000 });
        await teamMembersButton.click();

        // Wait for modal to open
        const teamModal = page.locator('.ant-modal').filter({ hasText: 'Manage Team Members' });
        await expect(teamModal).toBeVisible({ timeout: 5000 });

        // Switch to Add Member tab
        const addMemberTab = page.getByRole('tab', { name: 'Add Member' });
        await expect(addMemberTab).toBeVisible();
        await addMemberTab.click();

        // Click on the combobox in Add Member tab panel
        const addMemberPanel = page.getByRole('tabpanel', { name: 'Add Member' });
        const userCombobox = addMemberPanel.getByRole('combobox');
        await expect(userCombobox).toBeVisible();
        await userCombobox.click();

        // Select the user from dropdown
        const userOption = page.getByText(newUserEmail).nth(1);
        await expect(userOption).toBeVisible({ timeout: 5000 });
        await userOption.click();

        // Click the plus button to add the member
        const addButton = page.getByRole('button', { name: 'Add Member' });
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Wait a moment for the member to be added
        await page.waitForTimeout(1000);
        
        await testReporter.completeStep('Add user to team', 'passed');

        const stepVerifyMember = await testReporter.startStep('Verify user in team members');

        // Switch to Current Members tab
        const currentMembersTab = page.getByRole('tab', { name: 'Current Members' });
        await expect(currentMembersTab).toBeVisible();
        await currentMembersTab.click();

        // Verify user appears in members list
        const membersList = page.locator('.ant-list-items');
        await expect(membersList).toBeVisible();
        
        const userInList = membersList.locator('.ant-list-item-meta-title').filter({ hasText: newUserEmail });
        await expect(userInList).toBeVisible({ timeout: 5000 });
        
        await testReporter.completeStep('Verify user in team members', 'passed');

        await testReporter.finalizeTest();
    });
});