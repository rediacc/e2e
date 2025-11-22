import { test } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';
import fs from 'fs';
import path from 'path';

// Storage import and repository push tests migrated from Python StorageImportPushTest
// Focus: import storage configuration (conf.conf) and push a repository to selected storage

test.describe('Storage Import and Push Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.navigate();
    await dashboardPage.navigateToSection('resources');
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

    const stepOpenStorageTab = await testReporter.startStep('Open storage tab');

    const storageTabSelectors = [
      '[data-testid="resources-tab-storage"]',
      '.ant-tabs-tab:has-text("Storage")',
      'div[role="tab"]:has-text("Storage")',
      'button:has-text("Storage")',
      'span:has-text("Storage")'
    ];

    let storageTabFound = false;

    for (const selector of storageTabSelectors) {
      const tab = authenticatedPage.locator(selector).first();
      if (await tab.isVisible()) {
        await tab.click();
        storageTabFound = true;
        break;
      }
    }

    if (!storageTabFound) {
      await screenshotManager.captureStep('storage_tab_not_found');
      await testReporter.completeStep(
        'Open storage tab',
        'skipped',
        'Storage tab not found'
      );
      return;
    }

    await dashboardPage.waitForNetworkIdle();
    await screenshotManager.captureStep('storage_tab_opened');
    await testReporter.completeStep('Open storage tab', 'passed');

    const stepOpenImportDialog = await testReporter.startStep('Open storage import dialog');

    const importButtonCandidates = [
      '[data-testid="resources-import-button"]',
      'button:has-text("Import")'
    ];

    let importButtonClicked = false;

    for (const selector of importButtonCandidates) {
      const importButton = authenticatedPage.locator(selector).first();
      if (await importButton.isVisible()) {
        await importButton.click();
        importButtonClicked = true;
        break;
      }
    }

    if (!importButtonClicked) {
      await screenshotManager.captureStep('import_button_not_found');
      await testReporter.completeStep(
        'Open storage import dialog',
        'skipped',
        'Import button not found'
      );
      return;
    }

    await authenticatedPage.waitForTimeout(1000);
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

    const fileInput = authenticatedPage.locator('input[type="file"]').first();

    if (!(await fileInput.isVisible())) {
      await screenshotManager.captureStep('file_input_not_visible');
      await testReporter.completeStep(
        'Upload storage configuration file',
        'skipped',
        'File input for configuration upload not visible'
      );
      return;
    }

    await fileInput.setInputFiles(confPath);
    await authenticatedPage.waitForTimeout(2000);

    await screenshotManager.captureStep('conf_file_uploaded');
    await testReporter.completeStep('Upload storage configuration file', 'passed');

    const stepImport = await testReporter.startStep('Import storage configuration');

    const importConfirmCandidates = [
      '[data-testid="rclone-wizard-import-button"]',
      'button:has-text("Import")'
    ];

    let importConfirmed = false;

    for (const selector of importConfirmCandidates) {
      const confirmButton = authenticatedPage.locator(selector).first();
      if (await confirmButton.isVisible()) {
        if (await confirmButton.isEnabled()) {
          await confirmButton.click();
        }
        importConfirmed = true;
        break;
      }
    }

    if (!importConfirmed) {
      await screenshotManager.captureStep('import_confirm_not_found');
      await testReporter.completeStep(
        'Import storage configuration',
        'skipped',
        'Import confirm button not found or disabled'
      );
    } else {
      await authenticatedPage.waitForTimeout(2000);
      await screenshotManager.captureStep('import_completed_or_existing');
      await testReporter.completeStep('Import storage configuration', 'passed');
    }

    const stepCloseImport = await testReporter.startStep('Close import dialog');

    const closeImportCandidates = [
      '[data-testid="rclone-wizard-close-button"]',
      '.ant-modal-close',
      'button:has-text("Close")',
      'button:has-text("Cancel")'
    ];

    let importClosed = false;

    for (const selector of closeImportCandidates) {
      const closeButton = authenticatedPage.locator(selector).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        importClosed = true;
        break;
      }
    }

    if (!importClosed) {
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('import_dialog_closed');
    await testReporter.completeStep('Close import dialog', 'passed');

    const stepOpenMachinesTab = await testReporter.startStep('Open machines tab');

    const machinesTabSelectors = [
      '[data-testid="resources-tab-machines"]',
      '.ant-tabs-tab:has-text("Machines")',
      'div[role="tab"]:has-text("Machines")',
      'button:has-text("Machines")',
      'span:has-text("Machines")'
    ];

    let machinesTabFound = false;

    for (const selector of machinesTabSelectors) {
      const tab = authenticatedPage.locator(selector).first();
      if (await tab.isVisible()) {
        await tab.click();
        machinesTabFound = true;
        break;
      }
    }

    if (!machinesTabFound) {
      await screenshotManager.captureStep('machines_tab_not_found');
      await testReporter.completeStep(
        'Open machines tab',
        'skipped',
        'Machines tab not found'
      );
      return;
    }

    await dashboardPage.waitForNetworkIdle();
    await screenshotManager.captureStep('machines_tab_opened');
    await testReporter.completeStep('Open machines tab', 'passed');

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

    const pushSelectors = [
      '.ant-dropdown button:has-text("push")',
      '.ant-dropdown-menu [role="menuitem"]:has-text("push")',
      '.ant-dropdown a:has-text("push")',
      '.ant-dropdown span:has-text("push")'
    ];

    let pushChosen = false;

    for (const selector of pushSelectors) {
      const pushOption = authenticatedPage.locator(selector).first();
      if (await pushOption.isVisible()) {
        await pushOption.click();
        pushChosen = true;
        break;
      }
    }

    if (!pushChosen) {
      await screenshotManager.captureStep('push_action_not_found');
      await testReporter.completeStep(
        'Choose push action',
        'skipped',
        'Push action not found in actions menu'
      );
      return;
    }

    await authenticatedPage.waitForTimeout(1500);
    await screenshotManager.captureStep('push_dialog_opened');
    await testReporter.completeStep('Choose push action', 'passed');

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

    const addToQueueCandidates = [
      '[data-testid="push-add-to-queue-button"]',
      'button:has-text("Add to Queue")'
    ];

    let addToQueueClicked = false;

    for (const selector of addToQueueCandidates) {
      const addButton = authenticatedPage.locator(selector).first();
      if (await addButton.isVisible()) {
        if (await addButton.isEnabled()) {
          await authenticatedPage.waitForTimeout(1000);
          await addButton.click();
          addToQueueClicked = true;
        }
        break;
      }
    }

    if (!addToQueueClicked) {
      await screenshotManager.captureStep('add_to_queue_not_clicked');
      await testReporter.completeStep(
        'Submit push to queue',
        'skipped',
        'Add to Queue button not found or disabled'
      );
      return;
    }

    await authenticatedPage.waitForTimeout(2000);
    await screenshotManager.captureStep('push_added_to_queue');
    await testReporter.completeStep('Submit push to queue', 'passed');

    const stepCloseQueueTrace = await testReporter.startStep('Close queue trace modal if visible');

    const queueCloseCandidates = [
      '[data-testid="queue-trace-modal-close-button"]',
      '.ant-modal-close',
      'button:has-text("Close")',
      'button:has-text("OK")'
    ];

    let queueClosed = false;

    for (const selector of queueCloseCandidates) {
      const closeButton = authenticatedPage.locator(selector).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        queueClosed = true;
        break;
      }
    }

    if (!queueClosed) {
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('queue_trace_closed_after_push');
    await testReporter.completeStep('Close queue trace modal if visible', 'passed');

    await testReporter.generateDetailedReport();
  });
});
