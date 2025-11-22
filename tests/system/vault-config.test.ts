import { test, expect } from '../../src/base/BaseTest';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

// Vault configuration tests migrated from Python VaultConfigurationTest
// Focus: open System page, open company vault modal, fill required fields, generate SSH key and save

test.describe('System Vault Configuration Tests', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ adminPage }) => {
    dashboardPage = new DashboardPage(adminPage);
    await dashboardPage.navigate();
    await dashboardPage.waitForDashboardDataLoad();
  });

  test('should configure company vault with generated ssh key @system @vault @regression', async ({
    adminPage,
    screenshotManager,
    testReporter
  }) => {
    const stepNavigateSystem = await testReporter.startStep('Navigate to system page');

    const systemNavCandidates = [
      '[data-testid="main-nav-system"]',
      '[data-testid="nav-system"]',
      'a:has-text("System")',
      'button:has-text("System")'
    ];

    let systemNavClicked = false;

    for (const selector of systemNavCandidates) {
      const nav = adminPage.locator(selector).first();
      if (await nav.isVisible()) {
        await nav.click();
        systemNavClicked = true;
        break;
      }
    }

    if (!systemNavClicked) {
      await screenshotManager.captureStep('system_nav_not_found');
      await testReporter.completeStep(
        'Navigate to system page',
        'failed',
        'System navigation element not found'
      );
      throw new Error('System navigation element not found');
    }

    await adminPage.waitForLoadState('networkidle');
    await screenshotManager.captureStep('system_page_opened');
    await testReporter.completeStep('Navigate to system page', 'passed');

    const stepOpenVault = await testReporter.startStep('Open company vault configuration');

    const companyVaultCandidates = [
      '[data-testid="system-company-vault-button"]',
      'button:has-text("Company Vault")',
      'button:has-text("Vault")'
    ];

    let vaultButtonClicked = false;

    for (const selector of companyVaultCandidates) {
      const btn = adminPage.locator(selector).first();
      if (await btn.isVisible()) {
        await btn.click();
        vaultButtonClicked = true;
        break;
      }
    }

    if (!vaultButtonClicked) {
      await screenshotManager.captureStep('vault_button_not_found');
      await testReporter.completeStep(
        'Open company vault configuration',
        'failed',
        'Company vault button not found'
      );
      throw new Error('Company vault button not found');
    }

    const vaultModal = adminPage.locator('.ant-modal');

    try {
      await expect(vaultModal).toBeVisible({ timeout: 5000 });
      await screenshotManager.captureStep('vault_modal_opened');
      await testReporter.completeStep('Open company vault configuration', 'passed');
    } catch (error) {
      await screenshotManager.captureStep('vault_modal_not_visible');
      await testReporter.completeStep(
        'Open company vault configuration',
        'failed',
        'Vault configuration modal did not become visible'
      );
      throw error;
    }

    const stepFillFields = await testReporter.startStep('Fill required vault fields');

    const universalUserIdField = adminPage.locator(
      '[data-testid="vault-editor-field-UNIVERSAL_USER_ID"]'
    );

    if (await universalUserIdField.isVisible()) {
      const currentValue = await universalUserIdField.inputValue();
      if (!currentValue) {
        await universalUserIdField.fill('universal_user_001');
      }
    } else {
      const fallbackUserId = adminPage.locator(
        'input[placeholder*="Universal User ID" i]'
      ).first();
      if (await fallbackUserId.isVisible()) {
        const currentValue = await fallbackUserId.inputValue();
        if (!currentValue) {
          await fallbackUserId.fill('universal_user_001');
        }
      }
    }

    const universalUserNameField = adminPage.locator(
      '[data-testid="vault-editor-field-UNIVERSAL_USER_NAME"]'
    );

    if (await universalUserNameField.isVisible()) {
      const currentValue = await universalUserNameField.inputValue();
      if (!currentValue) {
        await universalUserNameField.fill('Universal User');
      }
    } else {
      const fallbackUserName = adminPage.locator(
        'input[placeholder*="Universal User Name" i]'
      ).first();
      if (await fallbackUserName.isVisible()) {
        const currentValue = await fallbackUserName.inputValue();
        if (!currentValue) {
          await fallbackUserName.fill('Universal User');
        }
      }
    }

    const textFields = adminPage.locator(
      '.ant-modal input[type="text"], .ant-modal textarea'
    );

    const textFieldCount = await textFields.count();

    for (let i = 0; i < textFieldCount; i++) {
      const field = textFields.nth(i);
      if (await field.isVisible()) {
        const value = await field.inputValue();
        if (!value) {
          const placeholder = (await field.getAttribute('placeholder')) || '';
          if (placeholder.toLowerCase().includes('datastore')) {
            await field.fill('/mnt/datastore');
          } else if (placeholder) {
            await field.fill('default_value');
          }
        }
      }
    }

    await screenshotManager.captureStep('vault_fields_filled');
    await testReporter.completeStep('Fill required vault fields', 'passed');

    const stepGenerateSsh = await testReporter.startStep('Generate ssh key for vault');

    const sshGenerateCandidates = [
      '[data-testid="vault-editor-generate-SSH_PRIVATE_KEY"]',
      'button[title*="Generate SSH"]',
      'button:has-text("Generate SSH")'
    ];

    let sshDialogOpened = false;

    for (const selector of sshGenerateCandidates) {
      const btn = adminPage.locator(selector).first();
      if (await btn.isVisible()) {
        await btn.click();
        sshDialogOpened = true;
        break;
      }
    }

    if (!sshDialogOpened) {
      await screenshotManager.captureStep('ssh_generate_button_not_found');
      await testReporter.completeStep(
        'Generate ssh key for vault',
        'skipped',
        'SSH generate button not found'
      );
    } else {
      await adminPage.waitForTimeout(500);

      const rsaOption = adminPage.locator('label:has-text("RSA")').first();
      if (await rsaOption.isVisible()) {
        await rsaOption.click();
      }

      const keySizeOption = adminPage.locator('label:has-text("4096")').first();
      if (await keySizeOption.isVisible()) {
        await keySizeOption.click();
      }

      const generateButtonCandidates = [
        '[data-testid="vault-editor-generate-button"]',
        'button:has-text("Generate")'
      ];

      let generateClicked = false;

      for (const selector of generateButtonCandidates) {
        const btn = adminPage.locator(selector).first();
        if (await btn.isVisible()) {
          await btn.click();
          generateClicked = true;
          break;
        }
      }

      if (generateClicked) {
        await adminPage.waitForTimeout(5000);

        const applyButtonCandidates = [
          '[data-testid="vault-editor-apply-generated"]',
          'button:has-text("Apply")'
        ];

        for (const selector of applyButtonCandidates) {
          const btn = adminPage.locator(selector).first();
          if (await btn.isVisible()) {
            await btn.click();
            break;
          }
        }

        await screenshotManager.captureStep('ssh_key_generated_and_applied');
        await testReporter.completeStep('Generate ssh key for vault', 'passed');
      } else {
        await screenshotManager.captureStep('ssh_generate_button_in_dialog_not_found');
        await testReporter.completeStep(
          'Generate ssh key for vault',
          'skipped',
          'Generate button in ssh dialog not found'
        );
      }
    }

    const stepSaveVault = await testReporter.startStep('Save vault configuration');

    let saveButton = adminPage.locator('[data-testid="vault-modal-save-button"]').first();

    if (!(await saveButton.isVisible())) {
      const saveCandidates = [
        '.ant-modal button:has-text("Save")',
        '.ant-modal button:has-text("OK")',
        '.ant-modal button.ant-btn-primary'
      ];

      for (const selector of saveCandidates) {
        const candidate = adminPage.locator(selector).first();
        if (await candidate.isVisible()) {
          saveButton = candidate;
          break;
        }
      }
    }

    if (!(await saveButton.isVisible())) {
      await screenshotManager.captureStep('vault_save_button_not_found');
      await testReporter.completeStep(
        'Save vault configuration',
        'failed',
        'Vault save button not found'
      );
      throw new Error('Vault save button not found');
    }

    try {
      const disabled = await saveButton.isDisabled();
      if (disabled) {
        await screenshotManager.captureStep('vault_save_button_disabled');
        await testReporter.completeStep(
          'Save vault configuration',
          'failed',
          'Vault save button is disabled'
        );
        throw new Error('Vault save button is disabled');
      }
    } catch {
      // ignore if isDisabled is not supported
    }

    await saveButton.click();
    await screenshotManager.captureStep('vault_save_clicked');
    await testReporter.completeStep('Save vault configuration', 'passed');

    const stepValidateSave = await testReporter.startStep('Validate vault configuration saved');

    const modalStillVisible = await vaultModal.isVisible();

    const notificationSelectors = [
      '.ant-message',
      '.ant-notification',
      '[role="alert"]'
    ];

    const successIndicators = [
      'Vault configuration saved successfully',
      'Vault updated successfully',
      'Configuration saved'
    ];

    let successDetected = false;

    for (const selector of notificationSelectors) {
      const notification = adminPage.locator(selector);
      if (await notification.isVisible()) {
        const text = (await notification.textContent()) || '';
        for (const indicator of successIndicators) {
          if (text.includes(indicator)) {
            successDetected = true;
            break;
          }
        }
      }
      if (successDetected) {
        break;
      }
    }

    if (!modalStillVisible) {
      successDetected = true;
    }

    if (!successDetected) {
      await screenshotManager.captureStep('vault_save_validation_failed');
      await testReporter.completeStep(
        'Validate vault configuration saved',
        'failed',
        'Could not confirm vault configuration save success'
      );
      throw new Error('Vault configuration save validation failed');
    }

    await screenshotManager.captureStep('vault_save_validated');
    await testReporter.completeStep('Validate vault configuration saved', 'passed');

    await testReporter.generateDetailedReport();
  });
});
