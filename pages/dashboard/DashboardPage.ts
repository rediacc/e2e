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
    super(page, '/console/dashboard');
    
    this.header = page.locator('[data-testid="main-nav-system"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.headerLogo = page.locator('[data-testid="main-logo-home"]');
    this.dashboardCards = page.locator('.ant-card');
    this.machineStatusWidget = page.locator('[data-testid="machine-status-widget"]');
    this.queueStatusWidget = page.locator('[data-testid="queue-status-widget"]');
    this.storageWidget = page.locator('[data-testid="storage-widget"]');
    this.activityLogWidget = page.locator('[data-testid="activity-log-widget"]');
    this.notificationBell = page.locator('[data-testid="notification-bell"]');
    this.teamSelector = page.locator('[data-testid="team-selector"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
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
    await this.verifyElementVisible(this.header);
    await this.verifyElementVisible(this.headerLogo);
    await this.waitForElement(this.dashboardCards.first());
  }

  async getDashboardCardCount(): Promise<number> {
    return await this.getElementCount(this.dashboardCards);
  }

  async clickUserMenu(): Promise<void> {
    await this.clickWithRetry(this.userMenu);
  }

  async navigateToSection(sectionName: string): Promise<void> {
    const sectionLink = this.page.locator(`[data-testid="nav-${sectionName.toLowerCase()}"]`);
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
    
    const onlineCount = await this.machineStatusWidget.locator('[data-testid="machines-online"]').textContent();
    const offlineCount = await this.machineStatusWidget.locator('[data-testid="machines-offline"]').textContent();
    const totalCount = await this.machineStatusWidget.locator('[data-testid="machines-total"]').textContent();
    
    return {
      online: parseInt(onlineCount || '0', 10),
      offline: parseInt(offlineCount || '0', 10),
      total: parseInt(totalCount || '0', 10)
    };
  }

  async getQueueStatus(): Promise<Record<string, number>> {
    await this.waitForElement(this.queueStatusWidget);
    
    const pendingCount = await this.queueStatusWidget.locator('[data-testid="queue-pending"]').textContent();
    const runningCount = await this.queueStatusWidget.locator('[data-testid="queue-running"]').textContent();
    const completedCount = await this.queueStatusWidget.locator('[data-testid="queue-completed"]').textContent();
    
    return {
      pending: parseInt(pendingCount || '0', 10),
      running: parseInt(runningCount || '0', 10),
      completed: parseInt(completedCount || '0', 10)
    };
  }

  async getStorageInfo(): Promise<Record<string, string>> {
    await this.waitForElement(this.storageWidget);
    
    const usedSpace = await this.storageWidget.locator('[data-testid="storage-used"]').textContent();
    const totalSpace = await this.storageWidget.locator('[data-testid="storage-total"]').textContent();
    const usagePercent = await this.storageWidget.locator('[data-testid="storage-percentage"]').textContent();
    
    return {
      used: usedSpace || '',
      total: totalSpace || '',
      percentage: usagePercent || ''
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
    const refreshButton = this.page.locator('[data-testid="refresh-dashboard"]');
    await this.clickWithRetry(refreshButton);
    await this.waitForNetworkIdle();
    await this.waitForDashboardDataLoad();
  }

  async logout(): Promise<void> {
    await this.clickUserMenu();
    const logoutButton = this.page.locator('[data-testid="logout-button"]');
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