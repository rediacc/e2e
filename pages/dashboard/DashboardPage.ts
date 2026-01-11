import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../src/base/BasePage';

export class DashboardPage extends BasePage {
  private readonly header: Locator;
  private readonly userMenu: Locator;
  private readonly headerLogo: Locator;
  private readonly dashboardCards: Locator;
  private readonly machineStatusWidget: Locator;
  private readonly queueStatusWidget: Locator;
  private readonly storageWidget: Locator;
  private readonly activityLogWidget: Locator;
  private readonly notificationBell: Locator;
  private readonly teamSelector: Locator;
  private readonly searchInput: Locator;

  constructor(page: Page) {
    super(page, '/console/machines');

    // All selectors use data-testid for stability
    this.header = page.locator('[data-testid="main-header"]'); // Main header (fallback to header tag)
    this.userMenu = page.locator('[data-testid="user-menu-button"]'); // User menu button
    this.headerLogo = page.locator('[data-testid="main-logo-home"]'); // Logo
    this.dashboardCards = page.locator('[data-testid="dashboard-card"]'); // Dashboard cards
    this.machineStatusWidget = page.locator('[data-testid="main-nav-machines"]'); // Machines nav item
    this.queueStatusWidget = page.locator('[data-testid="main-nav-queue"]'); // Queue nav item
    this.storageWidget = page.locator('[data-testid="main-content"]'); // Main content area
    this.activityLogWidget = page.locator('[data-testid="main-sidebar"]'); // Navigation sidebar
    this.notificationBell = page.locator('[data-testid="notification-bell"]'); // Notification bell
    this.teamSelector = page.locator('[data-testid="machines-team-selector"]'); // Team selector
    this.searchInput = page.locator('[data-testid="machines-search-input"]'); // Search input
  }

  getPageLocators(): Record<string, Locator> {
    return {
      header: this.header,
      userMenu: this.userMenu,
      headerLogo: this.headerLogo,
      dashboardCards: this.dashboardCards,
      machineStatusWidget: this.machineStatusWidget,
      queueStatusWidget: this.queueStatusWidget,
      storageWidget: this.storageWidget,
      activityLogWidget: this.activityLogWidget,
      notificationBell: this.notificationBell,
      teamSelector: this.teamSelector,
      searchInput: this.searchInput
    };
  }

  async verifyDashboardLoaded(): Promise<void> {
    // Verify main layout elements are visible
    await this.verifyElementVisible(this.header);
    //await this.verifyElementVisible(this.activityLogWidget); // Navigation sidebar
    await this.verifyElementVisible(this.storageWidget); // Main content area
  }

  async getDashboardCardCount(): Promise<number> {
    return await this.getElementCount(this.dashboardCards);
  }

  async clickUserMenu(): Promise<void> {
    await this.clickWithRetry(this.userMenu);
  }

  async navigateToSection(sectionName: string): Promise<void> {
    const sectionLink = this.page.locator(`[data-testid="main-nav-${sectionName.toLowerCase()}"]`);
    await this.clickWithRetry(sectionLink);
    await this.waitForNetworkIdle();
  }

  async selectTeam(teamName: string): Promise<void> {
    await this.clickWithRetry(this.teamSelector);
    const teamOption = this.page.locator(`[data-testid="team-option-${teamName}"]`);
    await this.clickWithRetry(teamOption);
    await this.waitForNetworkIdle();
  }

  async searchDashboard(query: string): Promise<void> {
    await this.fillWithClear(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.waitForNetworkIdle();
  }

  async getMachineStatus(): Promise<Record<string, number>> {
    await this.waitForElement(this.machineStatusWidget);

    // Resource usage card shows Machine and Repo usage percentages
    const machineProgress = this.machineStatusWidget.locator('[data-testid="dashboard-progress-machine"]');
    const repoProgress = this.machineStatusWidget.locator('[data-testid="dashboard-progress-repo"]');

    // Return resource counts (the card shows "X / Y" format in TileMeta)
    return {
      machineUsage: await machineProgress.count() > 0 ? 1 : 0,
      repoUsage: await repoProgress.count() > 0 ? 1 : 0,
      total: 2
    };
  }

  async getQueueStatus(): Promise<Record<string, number>> {
    await this.waitForElement(this.queueStatusWidget);

    const pendingCount = await this.queueStatusWidget.locator('[data-testid="dashboard-stat-pending"]').textContent();
    const runningCount = await this.queueStatusWidget.locator('[data-testid="dashboard-stat-processing"]').textContent();
    const completedCount = await this.queueStatusWidget.locator('[data-testid="dashboard-stat-completed"]').textContent();

    return {
      pending: parseInt(pendingCount || '0', 10),
      running: parseInt(runningCount || '0', 10),
      completed: parseInt(completedCount || '0', 10)
    };
  }

  async getStorageInfo(): Promise<Record<string, string>> {
    await this.waitForElement(this.storageWidget);

    // Subscription card shows license and plan info
    const activeLicenses = await this.storageWidget.locator('[data-testid="dashboard-stat-active-licenses"]').textContent();
    const daysRemaining = await this.storageWidget.locator('[data-testid="dashboard-stat-days-remaining"]').textContent();

    return {
      activeLicenses: activeLicenses || '',
      daysRemaining: daysRemaining || '',
      percentage: ''
    };
  }

  async getRecentActivities(): Promise<string[]> {
    await this.waitForElement(this.activityLogWidget);
    
    const activities = this.activityLogWidget.locator('.activity-item');
    return await this.getAllTextContents(activities);
  }

  async checkNotifications(): Promise<number> {
    const notificationCount = await this.notificationBell.locator('.notification-count').textContent();
    return parseInt(notificationCount || '0', 10);
  }

  async clickNotificationBell(): Promise<void> {
    await this.clickWithRetry(this.notificationBell);
  }

  async waitForDashboardDataLoad(): Promise<void> {
    await Promise.all([
      this.waitForElement(this.machineStatusWidget),
      this.waitForElement(this.queueStatusWidget),
      this.waitForElement(this.storageWidget),
      this.waitForElement(this.activityLogWidget)
    ]);
  }

  async refreshDashboard(): Promise<void> {
    const refreshButton = this.page.locator('[data-testid="machines-refresh-button"]');
    await this.clickWithRetry(refreshButton);
    await this.waitForNetworkIdle();
    await this.waitForDashboardDataLoad();
  }

  async logout(): Promise<void> {
    await this.clickUserMenu();
    const logoutButton = this.page.locator('[data-testid="main-logout-button"]');
    await this.clickWithRetry(logoutButton);
    await this.page.waitForURL('**/login');
  }

  async verifyUserLoggedIn(expectedUser?: string): Promise<void> {
    await this.verifyElementVisible(this.userMenu);
    
    if (expectedUser) {
      await this.clickUserMenu();
      const userInfo = this.page.locator('[data-testid="user-info"]');
      await this.verifyElementText(userInfo, expectedUser);
      await this.closeDialog();
    }
  }
}