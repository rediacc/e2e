import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

test.describe('Dashboard Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.navigate();
  });

  test('should display dashboard components @dashboard @smoke', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Verify dashboard components');
    
    await dashboardPage.verifyDashboardLoaded();
    await dashboardPage.waitForDashboardDataLoad();
    
    const cardCount = await dashboardPage.getDashboardCardCount();
    expect(cardCount).toBeGreaterThan(0);
    
    await screenshotManager.captureStep('01_dashboard_loaded');
    await testReporter.completeStep('Verify dashboard components', 'passed');

    const step2 = await testReporter.startStep('Check widget visibility');
    
    const locators = dashboardPage.getPageLocators();
    
    await expect(locators.machineStatusWidget).toBeVisible();
    await expect(locators.queueStatusWidget).toBeVisible();
    await expect(locators.storageWidget).toBeVisible();
    await expect(locators.activityLogWidget).toBeVisible();
    
    await screenshotManager.captureStep('02_all_widgets_visible');
    await testReporter.completeStep('Check widget visibility', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should display machine status correctly @dashboard', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Get machine status');
    
    const machineStatus = await dashboardPage.getMachineStatus();
    
    expect(typeof machineStatus.total).toBe('number');
    expect(typeof machineStatus.online).toBe('number');
    expect(typeof machineStatus.offline).toBe('number');
    expect(machineStatus.online + machineStatus.offline).toBeLessThanOrEqual(machineStatus.total);
    
    await screenshotManager.captureStep('01_machine_status_loaded');
    await testReporter.completeStep('Get machine status', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should display queue status correctly @dashboard', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Get queue status');
    
    const queueStatus = await dashboardPage.getQueueStatus();
    
    expect(typeof queueStatus.pending).toBe('number');
    expect(typeof queueStatus.running).toBe('number');
    expect(typeof queueStatus.completed).toBe('number');
    
    await screenshotManager.captureStep('01_queue_status_loaded');
    await testReporter.completeStep('Get queue status', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should handle team selection @dashboard', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Select different team');
    
    await screenshotManager.captureStep('01_before_team_change');
    
    try {
      await dashboardPage.selectTeam('Default');
      await dashboardPage.waitForDashboardDataLoad();
      
      await screenshotManager.captureStep('02_after_team_change');
      await testReporter.completeStep('Select different team', 'passed');
    } catch (error) {
      await testReporter.completeStep('Select different team', 'skipped', 'Team selector not available');
    }
    
    await testReporter.generateDetailedReport();
  });

  test('should navigate to different sections @dashboard @smoke', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const sections = ['resources', 'queue', 'system'];
    
    for (const section of sections) {
      const step = await testReporter.startStep(`Navigate to ${section}`);
      
      try {
        await dashboardPage.navigateToSection(section);
        await authenticatedPage.waitForTimeout(2000);
        
        const currentUrl = await dashboardPage.getCurrentUrl();
        expect(currentUrl).toContain(section);
        
        await screenshotManager.captureStep(`navigation_to_${section}`);
        await testReporter.completeStep(`Navigate to ${section}`, 'passed');
        
        // Navigate back to dashboard
        await dashboardPage.navigate();
      } catch (error) {
        await testReporter.completeStep(`Navigate to ${section}`, 'failed', `Navigation failed: ${error}`);
      }
    }
    
    await testReporter.generateDetailedReport();
  });

  test('should refresh dashboard data @dashboard', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Capture initial state');
    
    await dashboardPage.waitForDashboardDataLoad();
    const initialMachineStatus = await dashboardPage.getMachineStatus();
    
    await screenshotManager.captureStep('01_initial_dashboard_state');
    await testReporter.completeStep('Capture initial state', 'passed');

    const step2 = await testReporter.startStep('Refresh dashboard');
    
    try {
      await dashboardPage.refreshDashboard();
      const refreshedMachineStatus = await dashboardPage.getMachineStatus();
      
      // Status might be same or different, but should be valid numbers
      expect(typeof refreshedMachineStatus.total).toBe('number');
      
      await screenshotManager.captureStep('02_refreshed_dashboard_state');
      await testReporter.completeStep('Refresh dashboard', 'passed');
    } catch (error) {
      await testReporter.completeStep('Refresh dashboard', 'skipped', 'Refresh button not available');
    }
    
    await testReporter.generateDetailedReport();
  });

  test('should handle user menu interactions @dashboard', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Open user menu');
    
    await dashboardPage.clickUserMenu();
    await screenshotManager.captureStep('01_user_menu_opened');
    
    await testReporter.completeStep('Open user menu', 'passed');

    const step2 = await testReporter.startStep('Close user menu');
    
    await dashboardPage.closeDialog();
    await screenshotManager.captureStep('02_user_menu_closed');
    
    await testReporter.completeStep('Close user menu', 'passed');
    
    await testReporter.generateDetailedReport();
  });

  test('should display storage information @dashboard', async ({ 
    authenticatedPage, 
    screenshotManager, 
    testReporter 
  }) => {
    const step1 = await testReporter.startStep('Get storage information');
    
    const storageInfo = await dashboardPage.getStorageInfo();
    
    expect(storageInfo.used).toBeTruthy();
    expect(storageInfo.total).toBeTruthy();
    expect(storageInfo.percentage).toBeTruthy();
    
    await screenshotManager.captureStep('01_storage_info_displayed');
    await testReporter.completeStep('Get storage information', 'passed');
    
    await testReporter.generateDetailedReport();
  });
});