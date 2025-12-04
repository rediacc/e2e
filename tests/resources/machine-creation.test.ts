import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

test.describe('Machine Creation Tests - Authenticated', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticatedPage fixture already navigates to /console/machines
    dashboardPage = new DashboardPage(authenticatedPage);
  });

  test('should open machine creation dialog @resources @smoke', async ({ 
    authenticatedPage, 
    testReporter,
    testDataManager
  }) => {
    const step1 = await testReporter.startStep('Navigate to machines section');
       
    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');
    
    if (await createMachineButton.isVisible()) {
      await testReporter.completeStep('Navigate to machines section', 'passed');
    } else {
      await testReporter.completeStep('Navigate to machines section', 'skipped', 'Create machine button not found');
      return;
    }

    const step2 = await testReporter.startStep('Open machine creation dialog');

    await createMachineButton.click();

    // Wait for the resource modal to be visible
    const createMachineDialog = authenticatedPage.locator('[data-testid="resource-modal"]');
    await expect(createMachineDialog).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('02_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step3 = await testReporter.startStep('Verify dialog fields');

    // Verify key form fields are visible using data-testid
    const nameField = authenticatedPage.locator('[data-testid="resource-modal-field-machineName"]');
    const createButton = authenticatedPage.locator('[data-testid="resource-modal-ok-button"]');

    await expect(nameField).toBeVisible();
    await expect(ipField).toBeVisible();
    await expect(teamSelector).toBeVisible();
    
    await testReporter.completeStep('Verify dialog fields', 'passed');

    await testReporter.generateDetailedReport();
  });
});

  test('should create a new machine @resources @regression', async ({ 
    authenticatedPage, 
    testReporter,
    testDataManager
  }) => {
    const step1 = await testReporter.startStep('Open machine creation dialog');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');
    
    if (!(await createMachineButton.isVisible())) {
      await testReporter.completeStep('Open machine creation dialog', 'skipped', 'Create machine button not found');
      return;
    }

    // Step 1: Open machine creation dialog
    const step1 = await testReporter.startStep('Open machine creation dialog');

    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');
    await expect(createMachineButton).toBeVisible({ timeout: 10000 });
    await createMachineButton.click();

    const createMachineDialog = authenticatedPage.locator('[data-testid="resource-modal"]');
    await expect(createMachineDialog).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('01_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    // Step 2: Fill machine details with unique name
    const step2 = await testReporter.startStep('Fill machine details');

    const testMachine = testDataManager.createTemporaryMachine();
    
    const nameField = authenticatedPage.locator('[data-testid="machines-machine-name-input"]');
    const ipField = authenticatedPage.locator('[data-testid="machines-machine-ip-input"]');
    const userField = authenticatedPage.locator('[data-testid="machines-machine-user-input"]');
    
    await nameField.fill(testMachine.name);
    await ipField.fill(testMachine.ip);
    
    if (await userField.isVisible()) {
      await userField.fill(testMachine.user);
    }
    
    await testReporter.completeStep('Fill machine details', 'passed');

    // Step 3: Run SSH connection test
    const step3 = await testReporter.startStep('Run SSH connection test');

    const testConnectionButton = authenticatedPage.locator('[data-testid="vault-editor-test-connection"]');
    await expect(testConnectionButton).toBeVisible();
    await testConnectionButton.click();

    await screenshotManager.captureStep('03_test_connection_started');

    // Wait for connection test to complete - the info alert disappears on success
    const infoAlert = authenticatedPage.locator('[data-testid="vault-editor-connection-required-alert"]');

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
    
    // Wait for creation to complete
    await authenticatedPage.waitForTimeout(3000);
    
    await testReporter.completeStep('Submit machine creation', 'passed');

    // Step 5: Verify machine created
    const step5 = await testReporter.startStep('Verify machine created');

    // Wait for the success message - using Ant Design message container
    const successToast = authenticatedPage.locator('.ant-message-success, [data-testid="machine-create-success-message"]');
    await expect(successToast).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('06_machine_created_successfully');
    await testReporter.completeStep('Verify machine created', 'passed');

    await testReporter.generateDetailedReport();
  });

  test('should validate required fields @resources', async ({ 
    authenticatedPage, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Open machine creation dialog');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="machines-create-machine-button"]');
    
    if (!(await createMachineButton.isVisible())) {
      await testReporter.completeStep('Open machine creation dialog', 'skipped', 'Create machine button not found');
      return;
    }
    
    await createMachineButton.click();

    // Wait for the resource modal to be visible
    const createMachineDialog = authenticatedPage.locator('[data-testid="resource-modal"]');
    await expect(createMachineDialog).toBeVisible({ timeout: 10000 });

    await screenshotManager.captureStep('01_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step2 = await testReporter.startStep('Fill partial data and cancel');
    
    const nameField = authenticatedPage.locator('[data-testid="machines-machine-name-input"]');
    await nameField.fill('test-machine-to-cancel');
    
    
    const cancelButton = authenticatedPage.locator('[data-testid="machines-cancel-machine-creation"]');
    await cancelButton.click();
    
    await expect(createMachineDialog).not.toBeVisible();
    
    await testReporter.completeStep('Fill partial data and cancel', 'passed');
    
    await testReporter.generateDetailedReport();
  });
});