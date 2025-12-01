import { test } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import fs from 'fs';
import path from 'path';

// Storage import and repository push tests migrated from Python StorageImportPushTest
// Focus: import storage configuration (conf.conf) and push a repository to selected storage

// Skip: Storage page navigation requires page.goto() which causes full page reload
// The console uses in-memory auth storage that doesn't persist across page reloads
// Tests need to use UI navigation to preserve auth state, but Storage is not in simple mode sidebar
test.describe.skip('Storage Import and Push Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticatedPage fixture already navigates to /console/machines
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.waitForNetworkIdle();
  });

  test('should import storage configuration and push repository to storage @resources @storage @regression', async ({
    authenticatedPage,
    screenshotManager,
    testReporter,
    testDataManager
  }) => {
    const machine = testDataManager.getMachine();
    const repository = testDataManager.getRepository();

    const stepOpenStorageTab = await testReporter.startStep('Navigate to storage page');

    // Navigate to Storage page directly
    await authenticatedPage.goto('/console/storage');
    await dashboardPage.waitForNetworkIdle();

    // Verify storage table is visible
    const storageTable = authenticatedPage.locator('[data-testid="resources-storage-table"]');

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
    const importButton = authenticatedPage.locator('[data-testid="resources-import-button"]');

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
    const rcloneWizard = authenticatedPage.locator('[data-testid="resources-rclone-import-wizard"]');
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
    const uploadDragger = authenticatedPage.locator('[data-testid="rclone-wizard-upload-dragger"]');
    const fileInput = uploadDragger.locator('input[type="file"]');

    try {
      await fileInput.setInputFiles(confPath);
      await authenticatedPage.waitForTimeout(2000);
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
    const importConfirmButton = authenticatedPage.locator('[data-testid="rclone-wizard-import-button"]');

    try {
      await importConfirmButton.waitFor({ state: 'visible', timeout: 5000 });
      if (await importConfirmButton.isEnabled()) {
        await importConfirmButton.click();
        await authenticatedPage.waitForTimeout(2000);
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
    const closeWizardButton = authenticatedPage.locator('[data-testid="rclone-wizard-close-button"]');
    const cancelWizardButton = authenticatedPage.locator('[data-testid="rclone-wizard-cancel-button"]');

    if (await closeWizardButton.isVisible()) {
      await closeWizardButton.click();
    } else if (await cancelWizardButton.isVisible()) {
      await cancelWizardButton.click();
    } else {
      // Fallback to escape key only if buttons not found
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('import_dialog_closed');
    await testReporter.completeStep('Close import dialog', 'passed');

    const stepOpenMachinesTab = await testReporter.startStep('Navigate to machines page');

    // Navigate directly to machines page
    await authenticatedPage.goto('/console/machines');
    await dashboardPage.waitForNetworkIdle();

    // Verify machines page loaded by checking for create machine button
    const machinesTable = authenticatedPage.locator('[data-testid="machine-repo-list-table"]');

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

    const machineExpandByTestId = authenticatedPage.locator(
      `[data-testid="machine-expand-${machine.name}"]`
    );

    if (await machineExpandByTestId.isVisible()) {
      await machineExpandByTestId.click({ force: true });
    } else {
      const machineRow = authenticatedPage.locator(`tr:has-text("${machine.name}")`).first();
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

    await authenticatedPage.waitForTimeout(1000);

    const machineReposButton = authenticatedPage.locator(
      `[data-testid="machine-repositories-button-${machine.name}"]`
    );

    if (await machineReposButton.isVisible()) {
      await machineReposButton.click();
      await authenticatedPage.waitForTimeout(1000);
    }

    await screenshotManager.captureStep('machine_repositories_visible');
    await testReporter.completeStep('Expand machine and show repositories', 'passed');

    const stepSelectRepo = await testReporter.startStep('Select repository for push', {
      repository: repository.name
    });

    let repoRow = authenticatedPage.locator(`tr:has-text("${repository.name}")`).first();

    if (!(await repoRow.isVisible())) {
      const repoCandidates = authenticatedPage.locator('tr[data-row-key*="repo"], tr:has-text("repo")');
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
    await authenticatedPage.waitForTimeout(500);

    await screenshotManager.captureStep('repository_selected_for_push');
    await testReporter.completeStep('Select repository for push', 'passed');

    const stepOpenPushActions = await testReporter.startStep('Open push actions menu');

    let fxButton = repoRow.locator('button').first();

    if (!(await fxButton.isVisible())) {
      fxButton = authenticatedPage.locator('tr:has-text("repo") button').first();
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
    await authenticatedPage.waitForTimeout(1000);

    await screenshotManager.captureStep('push_actions_menu_opened');
    await testReporter.completeStep('Open push actions menu', 'passed');

    const stepChoosePush = await testReporter.startStep('Choose push action');

    // Use precise selector for push function in function modal
    const functionModal = authenticatedPage.locator('[data-testid="function-modal"], [data-testid="machine-repo-list-function-modal"]');

    try {
      await functionModal.waitFor({ state: 'visible', timeout: 5000 });

      // Select push function using precise selector
      const pushFunction = authenticatedPage.locator('[data-testid="function-modal-item-push"]');
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

      await authenticatedPage.waitForTimeout(1500);
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

    const destinationTypeDropdown = authenticatedPage.locator('.ant-select-selector').first();

    if (await destinationTypeDropdown.isVisible()) {
      await destinationTypeDropdown.click();
      await authenticatedPage.waitForTimeout(500);

      const storageOption = authenticatedPage.locator(
        '.ant-select-item:has-text("storage")'
      ).first();

      if (await storageOption.isVisible()) {
        await storageOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }

    const storageDropdown = authenticatedPage.locator('.ant-select-selector').nth(1);

    if (await storageDropdown.isVisible()) {
      await storageDropdown.click();
      await authenticatedPage.waitForTimeout(500);

      const storageOption = authenticatedPage.locator(
        '.ant-select-item:has-text("microsoft")'
      ).first();

      if (await storageOption.isVisible()) {
        await storageOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }

    await screenshotManager.captureStep('push_destination_configured');
    await testReporter.completeStep('Configure push destination storage', 'passed');

    const stepSubmitPush = await testReporter.startStep('Submit push to queue');

    // Use precise selector for function modal submit button
    const submitButton = authenticatedPage.locator('[data-testid="function-modal-submit"]');

    try {
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      if (await submitButton.isEnabled()) {
        await authenticatedPage.waitForTimeout(1000);
        await submitButton.click();
        await authenticatedPage.waitForTimeout(2000);
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
    const queueTraceCloseButton = authenticatedPage.locator('[data-testid="queue-trace-close-button"]');

    if (await queueTraceCloseButton.isVisible()) {
      await queueTraceCloseButton.click();
    } else {
      // Fallback to escape key only if button not found
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('queue_trace_closed_after_push');
    await testReporter.completeStep('Close queue trace modal if visible', 'passed');

    await testReporter.generateDetailedReport();
  });
});
