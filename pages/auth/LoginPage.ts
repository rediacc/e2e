import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../src/base/BasePage';
import { requireEnvVar } from '../../src/utils/env';

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly rememberMeCheckbox: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly registerLink: Locator;
  private readonly errorMessage: Locator;
  private readonly loadingSpinner: Locator;

  constructor(page: Page) {
    super(page, '/console/login');
    
    this.emailInput = page.locator('[data-testid="login-email-input"]');
    this.passwordInput = page.locator('[data-testid="login-password-input"]');
    this.loginButton = page.locator('[data-testid="login-submit-button"]');
    this.rememberMeCheckbox = page.locator('[data-testid="remember-me"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password"]');
    this.registerLink = page.locator('[data-testid="register-link"]');
    this.errorMessage = page.locator('[data-testid="login-error-alert"]');
    this.loadingSpinner = page.locator('.ant-spin');
  }

  getPageLocators(): Record<string, Locator> {
    return {
      emailInput: this.emailInput,
      passwordInput: this.passwordInput,
      loginButton: this.loginButton,
      rememberMeCheckbox: this.rememberMeCheckbox,
      forgotPasswordLink: this.forgotPasswordLink,
      registerLink: this.registerLink,
      errorMessage: this.errorMessage,
      loadingSpinner: this.loadingSpinner
    };
  }

  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    console.log(`Logging in with email: ${email}, rememberMe: ${rememberMe}`);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.loginButton.click();
    await this.waitForNetworkIdle();
  }

  async loginWithValidation(email: string, password: string): Promise<void> {
    await this.verifyElementVisible(this.emailInput);
    await this.verifyElementVisible(this.passwordInput);
    await this.verifyElementVisible(this.loginButton);
    
    await this.login(email, password);
  }

  async waitForLoginCompletion(): Promise<void> {
    await this.waitForElementToDisappear(this.loadingSpinner, 10000);
    await this.page.waitForURL('**/console/**', { timeout: 30000 });
  }

  async getErrorMessage(): Promise<string> {
    await this.waitForElement(this.errorMessage);
    return await this.errorMessage.textContent() || '';
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.loginButton.isEnabled();
  }

  async isRememberMeChecked(): Promise<boolean> {
    return await this.rememberMeCheckbox.isChecked();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    
    if (await this.rememberMeCheckbox.isChecked()) {
      await this.rememberMeCheckbox.uncheck();
    }
  }

  async fillEmailOnly(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPasswordOnly(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async verifyFormValidation(): Promise<void> {
    await this.verifyElementVisible(this.emailInput);
    await this.verifyElementVisible(this.passwordInput);
    await this.verifyElementEnabled(this.loginButton);
  }

  async performQuickLogin(): Promise<void> {
    const email = requireEnvVar('TEST_USER_EMAIL');
    const password = requireEnvVar('TEST_USER_PASSWORD');
    
    await this.login(email, password);
    await this.waitForLoginCompletion();
  }
}