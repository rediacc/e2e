import { FullConfig } from '@playwright/test';
import { InfrastructureManager } from '../utils/infrastructure/InfrastructureManager';
import { getOpsManager } from '../utils/bridge/OpsManager';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure .env file exists by copying from .env.example if not present.
 */
function ensureEnvFile() {
  const e2eDir = path.resolve(__dirname, '..', '..');
  const envPath = path.join(e2eDir, '.env');
  const envExamplePath = path.join(e2eDir, '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('Creating .env from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('Created .env file');
  }
}

/**
 * Clean previous bridge test reports to avoid confusion with stale files.
 */
function cleanBridgeReports() {
  const e2eDir = path.resolve(__dirname, '..', '..');
  const reportDirs = [
    path.join(e2eDir, 'reports', 'bridge'),
    path.join(e2eDir, 'reports', 'bridge-logs'),
  ];

  for (const dir of reportDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
  }
}

/**
 * Global setup for bridge tests.
 *
 * EXECUTION MODEL: All tests run on VMs via SSH
 * Host → Bridge VM → SSH → Worker/Ceph VM → renet command
 *
 * Setup sequence:
 * 1. Soft reset VMs (./go up_systems --force --parallel)
 * 2. Build renet and deploy to all VMs
 * 3. Verify all VMs are ready (bridge + workers + ceph)
 */
async function bridgeGlobalSetup(config: FullConfig) {
  // Ensure .env file exists
  ensureEnvFile();

  // Clean previous reports to avoid stale file confusion
  cleanBridgeReports();

  console.log('');
  console.log('='.repeat(60));
  console.log('Bridge Test Setup (SSH Mode)');
  console.log('='.repeat(60));

  const opsManager = getOpsManager();
  const infra = new InfrastructureManager();

  try {
    // Step 1: Soft reset VMs (mandatory - no skip option)
    console.log('');
    console.log('Step 1: Performing VM soft reset...');
    const resetResult = await opsManager.resetVMs();

    if (!resetResult.success) {
      throw new Error('VM reset failed - cannot proceed with tests');
    }
    console.log(`  ✓ VM reset completed in ${(resetResult.duration / 1000).toFixed(1)}s`);

    // Step 2: Build renet and deploy to all VMs
    console.log('');
    console.log('Step 2: Building and deploying renet...');
    await infra.ensureInfrastructure();
    console.log('  ✓ Renet deployed to all VMs');

    // Step 2b: Run renet setup on all worker VMs to create universal user (rediacc)
    // This is required for multi-machine operations (push/pull) that use sudo -u rediacc
    console.log('');
    console.log('Step 2b: Running renet setup on all worker VMs...');
    const workerIps = opsManager.getWorkerVMIps();
    for (const ip of workerIps) {
      const result = await opsManager.executeOnVM(ip, 'sudo renet setup');
      if (result.code !== 0) {
        console.error(`  ✗ Setup failed on ${ip}: ${result.stderr}`);
      } else {
        console.log(`  ✓ Setup completed on ${ip}`);
      }
    }

    // Step 3: Verify all VMs are ready
    console.log('');
    console.log('Step 3: Verifying all VMs are ready...');
    await opsManager.verifyAllVMsReady();

    // Step 4: Start RustFS S3 storage on bridge VM (mandatory for storage tests)
    console.log('');
    console.log('Step 4: Starting RustFS S3 storage...');
    const rustfsResult = await opsManager.startRustFS();
    if (rustfsResult.success) {
      console.log(`  ✓ ${rustfsResult.message}`);
    } else {
      throw new Error(`RustFS failed to start: ${rustfsResult.message}`);
    }

    // Step 5: Initialize datastores on all worker VMs
    console.log('');
    console.log('Step 5: Initializing datastores on all worker VMs...');
    await opsManager.initializeAllDatastores('10G', '/mnt/rediacc');
    console.log('  ✓ All datastores initialized');

    // Step 6: Deploy CRIU to all worker VMs
    console.log('');
    console.log('Step 6: Deploying CRIU to all worker VMs...');
    await infra.deployCRIUToAllVMs();
    console.log('  ✓ CRIU deployed to all worker VMs');

    console.log('');
    console.log('='.repeat(60));
    console.log('All VMs ready for SSH-based test execution');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('Setup failed:', error);
    console.error('='.repeat(60));
    throw error;
  }
}

export default bridgeGlobalSetup;
