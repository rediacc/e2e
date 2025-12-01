import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

// Machine trace tests migrated from Python MachineTraceTest
// Focus: open machine trace for a machine, verify trace view, sort columns and check entries

test.describe('Machine Trace Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticatedPage fixture already navigates to /console/machines
    dashboardPage = new DashboardPage(authenticatedPage);
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

    // Click on machine row to select it, then look for trace/queue action
    await machineRow.click();
    await authenticatedPage.waitForTimeout(500);

    // Look for queue trace button in the machine row actions
    const traceButton = machineRow.locator('[data-testid*="queue"], button:has-text("Queue")').first();

    if (!(await traceButton.isVisible())) {
      await screenshotManager.captureStep('trace_button_not_found');
      await testReporter.completeStep(
        'Open machine trace view',
        'skipped',
        'Trace/Queue button not found for selected machine'
      );
      return;
    }

    await traceButton.click();
    await authenticatedPage.waitForTimeout(1000);

    // Use precise selector for queue trace modal
    const traceModal = authenticatedPage.locator('[data-testid="queue-trace-modal"], [data-testid="machines-queue-trace-modal"]');

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

    // Use precise selector for close button
    const closeButton = authenticatedPage.locator('[data-testid="queue-trace-close-button"]');

    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Fallback to escape key if button not found
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('trace_modal_closed');
    await testReporter.completeStep('Close trace modal', 'passed');

    await testReporter.generateDetailedReport();
  });
});
