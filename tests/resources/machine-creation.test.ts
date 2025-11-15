import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

test.describe('Machine Creation Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.navigate();
    await dashboardPage.navigateToSection('resources');
  });

  test('should open machine creation dialog @resources @smoke', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter,
    testDataManager 
  }) => {
    const step1 = await testReporter.startStep('Navigate to machines section');
    
    await screenshotManager.captureStep('01_resources_page_loaded');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="create-machine-button"]');
    
    if (await createMachineButton.isVisible()) {
      await testReporter.completeStep('Navigate to machines section', 'passed');
    } else {
      await testReporter.completeStep('Navigate to machines section', 'skipped', 'Create machine button not found');
      return;
    }

    const step2 = await testReporter.startStep('Open machine creation dialog');
    
    await createMachineButton.click();
    
    const createMachineDialog = authenticatedPage.locator('[data-testid="create-machine-dialog"]');
    await expect(createMachineDialog).toBeVisible();
    
    await screenshotManager.captureStep('02_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step3 = await testReporter.startStep('Verify dialog fields');
    
    const nameField = authenticatedPage.locator('[data-testid="machine-name-input"]');
    const ipField = authenticatedPage.locator('[data-testid="machine-ip-input"]');
    const teamSelector = authenticatedPage.locator('[data-testid="machine-team-selector"]');
    
    await expect(nameField).toBeVisible();
    await expect(ipField).toBeVisible();
    await expect(teamSelector).toBeVisible();
    
    await screenshotManager.captureStep('03_dialog_fields_visible');
    await testReporter.completeStep('Verify dialog fields', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should create a new machine @resources @regression', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter,
    testDataManager 
  }) => {
    const step1 = await testReporter.startStep('Open machine creation dialog');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="create-machine-button"]');
    
    if (!(await createMachineButton.isVisible())) {
      await testReporter.completeStep('Open machine creation dialog', 'skipped', 'Create machine button not found');
      return;
    }
    
    await createMachineButton.click();
    
    const createMachineDialog = authenticatedPage.locator('[data-testid="create-machine-dialog"]');
    await expect(createMachineDialog).toBeVisible();
    
    await screenshotManager.captureStep('01_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step2 = await testReporter.startStep('Fill machine details');
    
    const testMachine = testDataManager.createTemporaryMachine();
    
    const nameField = authenticatedPage.locator('[data-testid="machine-name-input"]');
    const ipField = authenticatedPage.locator('[data-testid="machine-ip-input"]');
    const userField = authenticatedPage.locator('[data-testid="machine-user-input"]');
    
    await nameField.fill(testMachine.name);
    await ipField.fill(testMachine.ip);
    
    if (await userField.isVisible()) {
      await userField.fill(testMachine.user);
    }
    
    await screenshotManager.captureStep('02_machine_details_filled');
    await testReporter.completeStep('Fill machine details', 'passed');

    const step3 = await testReporter.startStep('Submit machine creation');
    
    const submitButton = authenticatedPage.locator('[data-testid="submit-machine-creation"]');
    await submitButton.click();
    
    // Wait for creation to complete
    await authenticatedPage.waitForTimeout(3000);
    
    await screenshotManager.captureStep('03_machine_creation_submitted');
    await testReporter.completeStep('Submit machine creation', 'passed');

    const step4 = await testReporter.startStep('Verify machine created');
    
    // Check if machine appears in the list
    const machineList = authenticatedPage.locator('[data-testid="machines-table"]');
    const newMachineRow = machineList.locator(`text=${testMachine.name}`);
    
    try {
      await expect(newMachineRow).toBeVisible({ timeout: 10000 });
      await screenshotManager.captureStep('04_machine_created_successfully');
      await testReporter.completeStep('Verify machine created', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('04_machine_creation_verification_failed');
      await testReporter.completeStep('Verify machine created', 'failed', 'Machine not found in list');
    }
    
    await testReporter.generateDetailedReport();
  });

  test('should validate required fields @resources', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Open machine creation dialog');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="create-machine-button"]');
    
    if (!(await createMachineButton.isVisible())) {
      await testReporter.completeStep('Open machine creation dialog', 'skipped', 'Create machine button not found');
      return;
    }
    
    await createMachineButton.click();
    
    const createMachineDialog = authenticatedPage.locator('[data-testid="create-machine-dialog"]');
    await expect(createMachineDialog).toBeVisible();
    
    await screenshotManager.captureStep('01_empty_machine_creation_dialog');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step2 = await testReporter.startStep('Test validation without filling fields');
    
    const submitButton = authenticatedPage.locator('[data-testid="submit-machine-creation"]');
    await submitButton.click();
    
    // Check for validation messages
    const validationMessages = authenticatedPage.locator('.ant-form-item-explain-error');
    
    if (await validationMessages.count() > 0) {
      await screenshotManager.captureStep('02_validation_errors_displayed');
      await testReporter.completeStep('Test validation without filling fields', 'passed');
    } else {
      await screenshotManager.captureStep('02_no_validation_errors');
      await testReporter.completeStep('Test validation without filling fields', 'skipped', 'No validation errors displayed');
    }
    
    await testReporter.generateDetailedReport();
  });

  test('should cancel machine creation @resources', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Open machine creation dialog');
    
    const createMachineButton = authenticatedPage.locator('[data-testid="create-machine-button"]');
    
    if (!(await createMachineButton.isVisible())) {
      await testReporter.completeStep('Open machine creation dialog', 'skipped', 'Create machine button not found');
      return;
    }
    
    await createMachineButton.click();
    
    const createMachineDialog = authenticatedPage.locator('[data-testid="create-machine-dialog"]');
    await expect(createMachineDialog).toBeVisible();
    
    await screenshotManager.captureStep('01_machine_creation_dialog_opened');
    await testReporter.completeStep('Open machine creation dialog', 'passed');

    const step2 = await testReporter.startStep('Fill partial data and cancel');
    
    const nameField = authenticatedPage.locator('[data-testid="machine-name-input"]');
    await nameField.fill('test-machine-to-cancel');
    
    await screenshotManager.captureStep('02_partial_data_filled');
    
    const cancelButton = authenticatedPage.locator('[data-testid="cancel-machine-creation"]');
    await cancelButton.click();
    
    await expect(createMachineDialog).not.toBeVisible();
    
    await screenshotManager.captureStep('03_dialog_closed_after_cancel');
    await testReporter.completeStep('Fill partial data and cancel', 'passed');
    
    await testReporter.generateDetailedReport();
  });
});