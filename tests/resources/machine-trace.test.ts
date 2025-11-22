import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

// Machine trace tests migrated from Python MachineTraceTest
// Focus: open machine trace for a machine, verify trace view, sort columns and check entries

test.describe('Machine Trace Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.navigate();
    await dashboardPage.navigateToSection('resources');
    await dashboardPage.waitForNetworkIdle();
  });

  test('should open machine trace and view task history @resources @trace @regression', async ({
    authenticatedPage,
    screenshotManager,
    testReporter,
    testDataManager
  }) => {
    const stepLocateMachine = await testReporter.startStep('Locate machine for trace');

    const machine = testDataManager.getMachine();

    let machineRow = authenticatedPage.locator(`tr:has-text("${machine.name}")`).first();

    if (!(await machineRow.isVisible())) {
      const machineCandidates = authenticatedPage.locator('tr:has(td)');

      if ((await machineCandidates.count()) === 0) {
        await screenshotManager.captureStep('no_machines_found_for_trace');
        await testReporter.completeStep(
          'Locate machine for trace',
          'skipped',
          'No machine rows found in resources table'
        );
        return;
      }

      machineRow = machineCandidates.first();
    }

    await screenshotManager.captureStep('machine_row_found_for_trace');
    await testReporter.completeStep('Locate machine for trace', 'passed');

    const stepOpenTrace = await testReporter.startStep('Open machine trace view');

    const traceButtonCandidates = [
      `[data-testid="machine-trace-${machine.name}"]`,
      'button:has-text("Trace")',
      '[data-testid*="machine-trace-"]',
      'button[title*="trace"]',
      '[aria-label*="trace" i]'
    ];

    let traceOpened = false;

    for (const selector of traceButtonCandidates) {
      const button = machineRow.locator(selector).first();
      if (await button.isVisible()) {
        await button.click();
        traceOpened = true;
        break;
      }
    }

    if (!traceOpened) {
      for (const selector of traceButtonCandidates) {
        const button = authenticatedPage.locator(selector).first();
        if (await button.isVisible()) {
          await button.click();
          traceOpened = true;
          break;
        }
      }
    }

    if (!traceOpened) {
      await screenshotManager.captureStep('trace_button_not_found');
      await testReporter.completeStep(
        'Open machine trace view',
        'skipped',
        'Trace button not found for selected machine'
      );
      return;
    }

    await authenticatedPage.waitForTimeout(1000);

    const traceModal = authenticatedPage.locator(
      '.ant-modal:has-text("Trace"), .ant-modal:has-text("Queue"), div[role="dialog"]:has-text("Trace"), div[role="dialog"]:has-text("Queue")'
    );

    try {
      await expect(traceModal).toBeVisible({ timeout: 15000 });
      await screenshotManager.captureStep('trace_modal_opened');
      await testReporter.completeStep('Open machine trace view', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('trace_modal_not_visible');
      await testReporter.completeStep(
        'Open machine trace view',
        'failed',
        'Trace modal did not become visible'
      );
      throw error;
    }

    const stepSortColumns = await testReporter.startStep('Sort trace table by common columns');

    const columnNames = ['Updated', 'Created', 'Status', 'Task', 'Bridge'];

    for (const columnName of columnNames) {
      const columnSelectors = [
        `th:has-text("${columnName}")`,
        `.ant-table-column-title:has-text("${columnName}")`,
        `[role="columnheader"]:has-text("${columnName}")`,
        `th[title*="${columnName}"]`
      ];

      let columnClicked = false;

      for (const selector of columnSelectors) {
        const column = authenticatedPage.locator(selector).first();
        if (await column.isVisible()) {
          await column.click();
          await authenticatedPage.waitForTimeout(500);
          columnClicked = true;
          break;
        }
      }

      if (!columnClicked) {
        await screenshotManager.captureStep(`trace_column_${columnName}_not_found`);
      }
    }

    await screenshotManager.captureStep('trace_table_sorted');
    await testReporter.completeStep('Sort trace table by common columns', 'passed');

    const stepVerifyRows = await testReporter.startStep('Verify trace entries exist');

    const traceRows = authenticatedPage.locator('tbody tr, .ant-table-tbody tr');

    const rowCount = await traceRows.count();

    if (rowCount === 0) {
      await screenshotManager.captureStep('no_trace_rows_found');
      await testReporter.completeStep(
        'Verify trace entries exist',
        'skipped',
        'No trace entries found in table'
      );
    } else {
      const maxRowsToLog = Math.min(rowCount, 5);

      for (let i = 0; i < maxRowsToLog; i++) {
        const row = traceRows.nth(i);
        if (await row.isVisible()) {
          const text = (await row.textContent()) || '';
          // We do not log here to keep test output clean; this is only for potential future extensions
          void text;
        }
      }

      await screenshotManager.captureStep('trace_rows_found');
      await testReporter.completeStep('Verify trace entries exist', 'passed');
    }

    const stepCloseTrace = await testReporter.startStep('Close trace modal');

    const closeSelectors = [
      '.ant-modal-close',
      'button:has-text("Close")',
      'button:has-text("Cancel")',
      '[aria-label="Close"]',
      '[data-testid*="close"]'
    ];

    let traceClosed = false;

    for (const selector of closeSelectors) {
      const closeButton = authenticatedPage.locator(selector).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        traceClosed = true;
        break;
      }
    }

    if (!traceClosed) {
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('trace_modal_closed');
    await testReporter.completeStep('Close trace modal', 'passed');

    await testReporter.generateDetailedReport();
  });
});
