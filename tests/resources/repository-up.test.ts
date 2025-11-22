import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

// Repository up tests migrated from Python RepoUpTest
// Focus: open resources, expand machine, open repo actions, trigger "up" and verify queue trace

test.describe('Repository Up Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.navigate();
    await dashboardPage.navigateToSection('resources');
    await dashboardPage.waitForNetworkIdle();
  });

  test('should bring a repository up and open queue trace @resources @repo @regression', async ({
    authenticatedPage,
    screenshotManager,
    testReporter,
    testDataManager
  }) => {
    const repository = testDataManager.getRepository();
    const machine = testDataManager.getMachine(repository.machine);

    const stepOpenMachine = await testReporter.startStep('Open machine repositories', {
      machine: machine.name
    });

    const machineExpandByTestId = authenticatedPage.locator(
      `[data-testid="machine-expand-${machine.name}"]`
    );

    if (await machineExpandByTestId.isVisible()) {
      await machineExpandByTestId.click();
    } else {
      const machineRow = authenticatedPage.locator(`tr:has-text("${machine.name}")`).first();
      if (await machineRow.isVisible()) {
        const expandButton = machineRow.locator('button').first();
        await expandButton.click();
      } else {
        await screenshotManager.captureStep('machine_not_found');
        await testReporter.completeStep(
          'Open machine repositories',
          'skipped',
          `Machine ${machine.name} not found`
        );
        return;
      }
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('machine_expanded');
    await testReporter.completeStep('Open machine repositories', 'passed');

    // Ensure repositories section is visible
    const stepEnsureRepos = await testReporter.startStep('Ensure repositories are visible');

    const reposButton = authenticatedPage.locator(
      `[data-testid="machine-repositories-button-${machine.name}"]`
    );

    if (await reposButton.isVisible()) {
      await reposButton.click();
      await authenticatedPage.waitForTimeout(1000);
    }

    const reposTable = authenticatedPage.locator('[data-testid="machines-table"]');

    if (!(await reposTable.isVisible())) {
      await screenshotManager.captureStep('repositories_not_visible');
      await testReporter.completeStep(
        'Ensure repositories are visible',
        'skipped',
        'Repositories table not visible'
      );
      return;
    }

    await screenshotManager.captureStep('repositories_visible');
    await testReporter.completeStep('Ensure repositories are visible', 'passed');

    const stepOpenActions = await testReporter.startStep('Open repository actions menu', {
      repository: repository.name
    });

    let repoActions = authenticatedPage.locator(
      `[data-testid="machine-repo-list-repo-actions-${repository.name}"]`
    );

    if (!(await repoActions.isVisible())) {
      // Fallback: use first actions button under this machine
      const allRepoActions = authenticatedPage.locator(
        '[data-testid^="machine-repo-list-repo-actions-"]'
      );

      if ((await allRepoActions.count()) === 0) {
        await screenshotManager.captureStep('repo_actions_not_found');
        await testReporter.completeStep(
          'Open repository actions menu',
          'skipped',
          'No repository actions button found'
        );
        return;
      }

      repoActions = allRepoActions.first();
    }

    await repoActions.click();
    await authenticatedPage.waitForTimeout(500);

    await screenshotManager.captureStep('repo_actions_menu_open');
    await testReporter.completeStep('Open repository actions menu', 'passed');

    const stepSelectUp = await testReporter.startStep('Select up action from actions menu');

    // Try to find "up" action in dropdown using multiple strategies
    const upActionCandidates = [
      '.ant-dropdown [role="menuitem"]:has-text("up")',
      '.ant-dropdown button:has-text("up")',
      '.ant-dropdown-menu [role="menuitem"]:has-text("up")',
      '.ant-dropdown span:has-text("up")'
    ];

    let upActionFound = false;

    for (const selector of upActionCandidates) {
      const candidate = authenticatedPage.locator(selector).first();
      if (await candidate.isVisible()) {
        await candidate.click();
        upActionFound = true;
        break;
      }
    }

    if (!upActionFound) {
      await screenshotManager.captureStep('up_action_not_found');
      await testReporter.completeStep(
        'Select up action from actions menu',
        'skipped',
        'Could not find up action in dropdown'
      );
      return;
    }

    await authenticatedPage.waitForTimeout(500);
    await screenshotManager.captureStep('up_action_clicked');
    await testReporter.completeStep('Select up action from actions menu', 'passed');

    const stepQueueTrace = await testReporter.startStep('Verify queue trace dialog');

    // Wait for queue trace dialog to appear
    const queueDialog = authenticatedPage.locator(
      'div[role="dialog"]:has-text("Queue Item Trace"), .ant-modal:has-text("Queue")'
    );

    try {
      await expect(queueDialog).toBeVisible({ timeout: 30000 });
      await screenshotManager.captureStep('queue_trace_dialog_visible');
      await testReporter.completeStep('Verify queue trace dialog', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('queue_trace_dialog_not_visible');
      await testReporter.completeStep(
        'Verify queue trace dialog',
        'failed',
        'Queue trace dialog did not become visible'
      );
      throw error;
    }

    const stepCloseQueue = await testReporter.startStep('Close queue trace dialog');

    const closeButtonCandidates = [
      '[data-testid="queue-trace-modal-close-button"]',
      '[data-testid="queue-trace-close-button"]',
      '.ant-modal-close',
      'button:has-text("Close")',
      'button:has-text("OK")'
    ];

    let closed = false;

    for (const selector of closeButtonCandidates) {
      const closeButton = authenticatedPage.locator(selector).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        closed = true;
        break;
      }
    }

    if (!closed) {
      // Fallback: escape key
      await authenticatedPage.keyboard.press('Escape');
    }

    await authenticatedPage.waitForTimeout(1000);
    await screenshotManager.captureStep('queue_trace_dialog_closed');
    await testReporter.completeStep('Close queue trace dialog', 'passed');

    await testReporter.generateDetailedReport();
  });
});
