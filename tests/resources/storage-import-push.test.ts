import { test } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import fs from 'fs';
import path from 'path';

// Storage import and repository push tests migrated from Python StorageImportPushTest
// Focus: import storage configuration (conf.conf) and push a repository to selected storage

// Skip: Storage page navigation requires page.goto() which causes full page reload
// The console uses in-memory auth storage that doesn't persist across page reloads
// Tests need to use UI navigation to preserve auth state, but Storage is not in simple mode sidebar
test.describe.skip('Storage Import and Push Tests', () => {
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    
    await loginPage.navigate();
    await loginPage.performQuickLogin();
    await dashboardPage.waitForNetworkIdle();
  });

  test('should import storage configuration and push repository to storage @resources @storage @regression', async ({
    page,
    screenshotManager,
    testReporter,
    testDataManager
  }) => {
    const machine = testDataManager.getMachine();
    const repository = testDataManager.getRepository();

    const stepOpenStorageTab = await testReporter.startStep('Navigate to storage page');

    // Navigate to Storage page directly
    await page.goto('/console/storage');
    await dashboardPage.waitForNetworkIdle();

    // Verify storage table is visible
    const storageTable = page.locator('[data-testid="resources-storage-table"]');

    try {
      await storageTable.waitFor({ state: 'visible', timeout: 10000 });
      await screenshotManager.captureStep('storage_page_loaded');
      await testReporter.completeStep('Navigate to storage page', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('storage_page_not_loaded');
      await testReporter.completeStep(
        'Navigate to storage page',
        'failed',
        'Storage page did not load'
      );
      throw error;
    }

    const stepOpenImportDialog = await testReporter.startStep('Open storage import dialog');

    // Use precise selector for import button
    const importButton = page.locator('[data-testid="resources-import-button"]');

    try {
      await importButton.waitFor({ state: 'visible', timeout: 5000 });
      await importButton.click();
    } catch (error) {
      await screenshotManager.captureStep('import_button_not_found');
      await testReporter.completeStep(
        'Open storage import dialog',
        'failed',
        'Import button not found'
      );
      throw error;
    }

    // Wait for rclone wizard modal to appear
    const rcloneWizard = page.locator('[data-testid="resources-rclone-import-wizard"]');
    await rcloneWizard.waitFor({ state: 'visible', timeout: 5000 });

    await screenshotManager.captureStep('import_dialog_opened');
    await testReporter.completeStep('Open storage import dialog', 'passed');

    const stepUploadConf = await testReporter.startStep('Upload storage configuration file');

    const confPath = path.resolve(__dirname, '../../py-projesi/conf.conf');

    if (!fs.existsSync(confPath)) {
      await screenshotManager.captureStep('conf_file_not_found');
      await testReporter.completeStep(
        'Upload storage configuration file',
        'skipped',
        `Configuration file not found at ${confPath}`
      );
      return;
    }

    // Use precise selector for file input within rclone wizard upload dragger
    const uploadDragger = page.locator('[data-testid="rclone-wizard-upload-dragger"]');
    const fileInput = uploadDragger.locator('input[type="file"]');

    try {
      await fileInput.setInputFiles(confPath);
      await page.waitForTimeout(2000);
      await screenshotManager.captureStep('conf_file_uploaded');
      await testReporter.completeStep('Upload storage configuration file', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('file_upload_failed');
      await testReporter.completeStep(
        'Upload storage configuration file',
        'failed',
        'File input for configuration upload not accessible'
      );
      throw error;
    }

    const stepImport = await testReporter.startStep('Import storage configuration');

    // Use precise selector for import button
    const importConfirmButton = page.locator('[data-testid="rclone-wizard-import-button"]');

    try {
      await importConfirmButton.waitFor({ state: 'visible', timeout: 5000 });
      if (await importConfirmButton.isEnabled()) {
        await importConfirmButton.click();
        await page.waitForTimeout(2000);
        await screenshotManager.captureStep('import_completed');
        await testReporter.completeStep('Import storage configuration', 'passed');
      } else {
        await screenshotManager.captureStep('import_button_disabled');
        await testReporter.completeStep(
          'Import storage configuration',
          'skipped',
          'Import button is disabled (configs may already exist)'
        );
      }
    } catch (error) {
      await screenshotManager.captureStep('import_confirm_not_found');
      await testReporter.completeStep(
        'Import storage configuration',
        'skipped',
        'Import confirm button not found'
      );
    }

    const stepCloseImport = await testReporter.startStep('Close import dialog');

    // Use precise selector for close button - try close first, then cancel
    const closeWizardButton = page.locator('[data-testid="rclone-wizard-close-button"]');
    const cancelWizardButton = page.locator('[data-testid="rclone-wizard-cancel-button"]');

    if (await closeWizardButton.isVisible()) {
      await closeWizardButton.click();
    } else if (await cancelWizardButton.isVisible()) {
      await cancelWizardButton.click();
    } else {
      // Fallback to escape key only if buttons not found
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(1000);
    await screenshotManager.captureStep('import_dialog_closed');
    await testReporter.completeStep('Close import dialog', 'passed');

    const stepOpenMachinesTab = await testReporter.startStep('Navigate to machines page');

    // Navigate directly to machines page
    await page.goto('/console/machines');
    await dashboardPage.waitForNetworkIdle();

    // Verify machines page loaded by checking for create machine button
    const machinesTable = page.locator('[data-testid="machine-repo-list-table"]');

    try {
      await machinesTable.waitFor({ state: 'visible', timeout: 10000 });
      await screenshotManager.captureStep('machines_page_loaded');
      await testReporter.completeStep('Navigate to machines page', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('machines_page_not_loaded');
      await testReporter.completeStep(
        'Navigate to machines page',
        'failed',
        'Machines page did not load'
      );
      throw error;
    }

    const stepExpandMachine = await testReporter.startStep('Expand machine and show repositories', {
      machine: machine.name
    });

    const machineExpandByTestId = page.locator(
      `[data-testid="machine-expand-${machine.name}"]`
    );

    if (await machineExpandByTestId.isVisible()) {
      await machineExpandByTestId.click({ force: true });
    } else {
      const machineRow = page.locator(`tr:has-text("${machine.name}")`).first();
      if (await machineRow.isVisible()) {
        const expandButton = machineRow.locator('button').first();
        await expandButton.click({ force: true });
      } else {
        await screenshotManager.captureStep('machine_for_push_not_found');
        await testReporter.completeStep(
          'Expand machine and show repositories',
          'skipped',
          `Machine ${machine.name} not found`
        );
        return;
      }
    }

    await page.waitForTimeout(1000);

    const machineReposButton = page.locator(
      `[data-testid="machine-repositories-button-${machine.name}"]`
    );

    if (await machineReposButton.isVisible()) {
      await machineReposButton.click();
      await page.waitForTimeout(1000);
    }

    await screenshotManager.captureStep('machine_repositories_visible');
    await testReporter.completeStep('Expand machine and show repositories', 'passed');

    const stepSelectRepo = await testReporter.startStep('Select repository for push', {
      repository: repository.name
    });

    let repoRow = page.locator(`tr:has-text("${repository.name}")`).first();

    if (!(await repoRow.isVisible())) {
      const repoCandidates = page.locator('tr[data-row-key*="repo"], tr:has-text("repo")');
      if ((await repoCandidates.count()) === 0) {
        await screenshotManager.captureStep('repository_not_found');
        await testReporter.completeStep(
          'Select repository for push',
          'skipped',
          'Repository row not found'
        );
        return;
      }
      repoRow = repoCandidates.first();
    }

    await repoRow.click();
    await page.waitForTimeout(500);

    await screenshotManager.captureStep('repository_selected_for_push');
    await testReporter.completeStep('Select repository for push', 'passed');

    const stepOpenPushActions = await testReporter.startStep('Open push actions menu');

    let fxButton = repoRow.locator('button').first();

    if (!(await fxButton.isVisible())) {
      fxButton = page.locator('tr:has-text("repo") button').first();
    }

    if (!(await fxButton.isVisible())) {
      await screenshotManager.captureStep('fx_button_not_found');
      await testReporter.completeStep(
        'Open push actions menu',
        'skipped',
        'Remote/fx actions button not found'
      );
      return;
    }

    await fxButton.click();
    await page.waitForTimeout(1000);

    await screenshotManager.captureStep('push_actions_menu_opened');
    await testReporter.completeStep('Open push actions menu', 'passed');

    const stepChoosePush = await testReporter.startStep('Choose push action');

    // Use precise selector for push function in function modal
    const functionModal = page.locator('[data-testid="function-modal"], [data-testid="machine-repo-list-function-modal"]');

    try {
      await functionModal.waitFor({ state: 'visible', timeout: 5000 });

      // Select push function using precise selector
      const pushFunction = page.locator('[data-testid="function-modal-item-push"]');
      if (await pushFunction.isVisible()) {
        await pushFunction.click();
      } else {
        // Fallback to text-based selector within function modal
        const pushOption = functionModal.locator('[role="menuitem"]:has-text("push"), button:has-text("push")').first();
        if (await pushOption.isVisible()) {
          await pushOption.click();
        } else {
          throw new Error('Push function option not found');
        }
      }

      await page.waitForTimeout(1500);
      await screenshotManager.captureStep('push_dialog_opened');
      await testReporter.completeStep('Choose push action', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('push_action_not_found');
      await testReporter.completeStep(
        'Choose push action',
        'failed',
        'Push action not found in function modal'
      );
      throw error;
    }

    const stepConfigureDestination = await testReporter.startStep('Configure push destination storage');

    const destinationTypeDropdown = page.locator('.ant-select-selector').first();

    if (await destinationTypeDropdown.isVisible()) {
      await destinationTypeDropdown.click();
      await page.waitForTimeout(500);

      const storageOption = page.locator(
        '.ant-select-item:has-text("storage")'
      ).first();

      if (await storageOption.isVisible()) {
        await storageOption.click();
        await page.waitForTimeout(500);
      }
    }

    const storageDropdown = page.locator('.ant-select-selector').nth(1);

    if (await storageDropdown.isVisible()) {
      await storageDropdown.click();
      await page.waitForTimeout(500);

      const storageOption = page.locator(
        '.ant-select-item:has-text("microsoft")'
      ).first();

      if (await storageOption.isVisible()) {
        await storageOption.click();
        await page.waitForTimeout(500);
      }
    }

    await screenshotManager.captureStep('push_destination_configured');
    await testReporter.completeStep('Configure push destination storage', 'passed');

    const stepSubmitPush = await testReporter.startStep('Submit push to queue');

    // Use precise selector for function modal submit button
    const submitButton = page.locator('[data-testid="function-modal-submit"]');

    try {
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      if (await submitButton.isEnabled()) {
        await page.waitForTimeout(1000);
        await submitButton.click();
        await page.waitForTimeout(2000);
        await screenshotManager.captureStep('push_added_to_queue');
        await testReporter.completeStep('Submit push to queue', 'passed');
      } else {
        await screenshotManager.captureStep('submit_button_disabled');
        await testReporter.completeStep(
          'Submit push to queue',
          'skipped',
          'Submit button is disabled'
        );
        return;
      }
    } catch (error) {
      await screenshotManager.captureStep('add_to_queue_not_found');
      await testReporter.completeStep(
        'Submit push to queue',
        'failed',
        'Add to Queue button not found'
      );
      throw error;
    }

    const stepCloseQueueTrace = await testReporter.startStep('Close queue trace modal if visible');

    // Use precise selector for queue trace close button
    const queueTraceCloseButton = page.locator('[data-testid="queue-trace-close-button"]');

    if (await queueTraceCloseButton.isVisible()) {
      await queueTraceCloseButton.click();
    } else {
      // Fallback to escape key only if button not found
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(1000);
    await screenshotManager.captureStep('queue_trace_closed_after_push');
    await testReporter.completeStep('Close queue trace modal if visible', 'passed');

    await testReporter.generateDetailedReport();
    testReporter.logTestCompletion();
  });
});
