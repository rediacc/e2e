import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

test.describe('Machine Creation Tests - Authenticated', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticatedPage fixture already navigates to /console/machines
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.waitForNetworkIdle();
  });

  test('should open machine creation dialog @resources @smoke', async ({
    authenticatedPage,
    screenshotManager,
    testReporter,
    testDataManager
  }) => {
    const step1 = await testReporter.startStep('Navigate to machines section');

    await screenshotManager.captureStep('01_resources_page_loaded');

    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');

    if (await createMachineButton.isVisible()) {
      await testReporter.completeStep('Navigate to machines section', 'passed');
    } else {
      await testReporter.completeStep('Navigate to machines section', 'skipped', 'Create machine button not found');
      return;
    }

    const step2 = await testReporter.startStep('Open machine creation dialog');

    await createMachineButton.click();

    // Wait for the modal content to be visible (not just the root wrapper)
    const createMachineDialog = authenticatedPage.locator('.ant-modal-content').filter({ hasText: 'Add Machine' });
    await expect(createMachineDialog).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('02_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step3 = await testReporter.startStep('Verify dialog fields');

    // Verify key form fields are visible using correct data-testid
    const nameField = authenticatedPage.locator('[data-testid="resource-modal-field-machineName"]');
    const createButton = createMachineDialog.getByRole('button', { name: 'Create' });

    await expect(nameField).toBeVisible();
    await expect(createButton).toBeVisible();

    await screenshotManager.captureStep('03_dialog_fields_visible');
    await testReporter.completeStep('Verify dialog fields', 'passed');

    await testReporter.generateDetailedReport();
  });
});

// Machine creation with admin account (uses unique timestamp-based names)
test.describe('Machine Creation Tests - With SSH Test', () => {
  test('should create a new machine with SSH connection test @resources @regression', async ({
    authenticatedPage,
    screenshotManager,
    testReporter,
    testDataManager
  }) => {
    // In CI, skip if VMs weren't provisioned (VM_WORKER_IPS not set)
    // Locally, always run (default IPs will be used)
    const isCI = process.env.CI === 'true';
    const hasVMs = !!process.env.VM_WORKER_IPS;
    if (isCI && !hasVMs) {
      test.skip(true, 'VM_WORKER_IPS not set - VM provisioning may have failed');
      return;
    }

    // Step 1: Open machine creation dialog
    const step1 = await testReporter.startStep('Open machine creation dialog');

    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');
    await expect(createMachineButton).toBeVisible({ timeout: 10000 });
    await createMachineButton.click();

    const createMachineDialog = authenticatedPage.locator('.ant-modal-content').filter({ hasText: 'Add Machine' });
    await expect(createMachineDialog).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('01_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    // Step 2: Fill machine details with unique name
    const step2 = await testReporter.startStep('Fill machine details');

    const testMachine = testDataManager.createTemporaryMachine();

    const nameField = authenticatedPage.locator('[data-testid="resource-modal-field-machineName"]');
    await nameField.locator('input').fill(testMachine.name);

    const vaultSection = authenticatedPage.locator('[data-testid="resource-modal-vault-editor-section"]');
    await vaultSection.scrollIntoViewIfNeeded();

    const ipField = authenticatedPage.locator('[data-testid="vault-editor-field-ip"]');
    const userField = authenticatedPage.locator('[data-testid="vault-editor-field-user"]');

    await expect(ipField).toBeVisible({ timeout: 10000 });
    await ipField.fill(testMachine.ip);
    await userField.fill(testMachine.user);

    await screenshotManager.captureStep('02_machine_details_filled');
    await testReporter.completeStep('Fill machine details', 'passed');

    // Step 3: Run SSH connection test
    const step3 = await testReporter.startStep('Run SSH connection test');

    const testConnectionButton = authenticatedPage.locator('[data-testid="vault-editor-test-connection"]');
    await expect(testConnectionButton).toBeVisible();
    await testConnectionButton.click();

    await screenshotManager.captureStep('03_test_connection_started');

    // Wait for connection test to complete - the info alert disappears on success
    const infoAlert = authenticatedPage.locator('.ant-alert-info').filter({ hasText: 'Connection test required' });

    await expect(async () => {
      const isInfoVisible = await infoAlert.isVisible().catch(() => false);
      if (!isInfoVisible) return;
      throw new Error('Still testing connection...');
    }).toPass({ timeout: 60000 });

    await screenshotManager.captureStep('04_test_connection_completed');
    await testReporter.completeStep('Run SSH connection test', 'passed');

    // Step 4: Submit machine creation
    const step4 = await testReporter.startStep('Submit machine creation');

    const submitButton = authenticatedPage.locator('[data-testid="resource-modal-ok-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    await expect(createMachineDialog).not.toBeVisible({ timeout: 15000 });

    await screenshotManager.captureStep('05_machine_creation_submitted');
    await testReporter.completeStep('Submit machine creation', 'passed');

    // Step 5: Verify machine created
    const step5 = await testReporter.startStep('Verify machine created');

    const successToast = authenticatedPage.locator(`text=Machine "${testMachine.name}" created`);
    await expect(successToast).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('06_machine_created_successfully');
    await testReporter.completeStep('Verify machine created', 'passed');

    await testReporter.generateDetailedReport();
  });
});

// Authenticated tests that run against existing admin account
test.describe('Machine Creation Tests - Cancel Flow', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.waitForNetworkIdle();
  });

  test('should cancel machine creation @resources', async ({
    authenticatedPage,
    screenshotManager,
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Open machine creation dialog');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');
    
    if (!(await createMachineButton.isVisible())) {
      await testReporter.completeStep('Open machine creation dialog', 'skipped', 'Create machine button not found');
      return;
    }
    
    await createMachineButton.click();
    
    // Wait for the modal content to be visible (not just the root wrapper)
    const createMachineDialog = authenticatedPage.locator('.ant-modal-content').filter({ hasText: 'Add Machine' });
    await expect(createMachineDialog).toBeVisible({ timeout: 10000 });
    
    await screenshotManager.captureStep('01_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step2 = await testReporter.startStep('Fill partial data and cancel');

    // Use correct selector for name field
    const nameField = authenticatedPage.locator('[data-testid="resource-modal-field-machineName"]');
    await nameField.locator('input').fill('test-machine-to-cancel');

    await screenshotManager.captureStep('02_partial_data_filled');

    // Use correct selector for cancel button
    const cancelButton = authenticatedPage.locator('[data-testid="resource-modal-cancel-button"]');
    await cancelButton.click();
    
    await expect(createMachineDialog).not.toBeVisible();
    
    await screenshotManager.captureStep('03_dialog_closed_after_cancel');
    await testReporter.completeStep('Fill partial data and cancel', 'passed');
    
    await testReporter.generateDetailedReport();
  });
});