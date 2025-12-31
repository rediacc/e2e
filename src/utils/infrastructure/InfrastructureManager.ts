import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { getOpsManager, OpsManager } from '../bridge/OpsManager';
import { RENET_BINARY_PATH } from '../../constants';

const execAsync = promisify(exec);

/**
 * Calculate MD5 hash of a file.
 */
function getFileMD5(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

export interface InfrastructureConfig {
  monorepoRoot: string;
  renetPath: string;
  bridgeVM: string;
  workerVM: string;
  defaultTimeout: number;
}

/**
 * InfrastructureManager for bridge tests.
 *
 * Always runs in full VM mode:
 * - Automatically starts VMs using ops scripts if not running
 * - Verifies renet is installed on all VMs
 * - No middleware or Docker containers required - renet runs in local/test mode
 */
export class InfrastructureManager {
  private config: InfrastructureConfig;
  private detectedRenetPath: string | null = null;
  private opsManager: OpsManager;

  constructor() {
    this.opsManager = getOpsManager();

    this.config = {
      monorepoRoot: process.env.MONOREPO_ROOT || '/home/muhammed/monorepo',
      renetPath: process.env.RENET_PATH || '',
      bridgeVM: this.opsManager.getBridgeVMIp(),
      workerVM: this.opsManager.getWorkerVMIps()[0],
      defaultTimeout: parseInt(process.env.BRIDGE_TIMEOUT || '30000'),
    };
  }

  /**
   * Get the path to renet binary (cached after first detection).
   */
  getRenetPath(): string {
    if (this.detectedRenetPath) {
      return this.detectedRenetPath;
    }
    return this.config.renetPath || 'renet';
  }

  /**
   * Check if renet binary is available locally.
   */
  async isRenetAvailable(): Promise<{ available: boolean; path: string }> {
    // 1. Check explicit path from env
    if (this.config.renetPath) {
      try {
        await execAsync(`${this.config.renetPath} version`, { timeout: 5000 });
        this.detectedRenetPath = this.config.renetPath;
        return { available: true, path: this.config.renetPath };
      } catch {
        // Continue to other options
      }
    }

    // 2. Check if in PATH
    try {
      await execAsync('renet version', { timeout: 5000 });
      this.detectedRenetPath = 'renet';
      return { available: true, path: 'renet' };
    } catch {
      // Continue to other options
    }

    // 3. Check monorepo build path
    const buildPath = path.join(this.config.monorepoRoot, 'renet/bin/renet');
    try {
      await execAsync(`${buildPath} version`, { timeout: 5000 });
      this.detectedRenetPath = buildPath;
      return { available: true, path: buildPath };
    } catch {
      // Not found
    }

    return { available: false, path: '' };
  }

  /**
   * Check if bridge VM is reachable via SSH.
   */
  async isBridgeVMReachable(): Promise<boolean> {
    try {
      await execAsync(
        `ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no ${this.config.bridgeVM} "echo ok"`,
        { timeout: 10000 }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if worker VM is reachable via SSH.
   */
  async isWorkerVMReachable(): Promise<boolean> {
    try {
      await execAsync(
        `ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no ${this.config.workerVM} "echo ok"`,
        { timeout: 10000 }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current infrastructure status.
   */
  async getStatus(): Promise<{
    renet: { available: boolean; path: string };
    bridgeVM: boolean;
    workerVM: boolean;
  }> {
    const [renet, bridgeVM, workerVM] = await Promise.all([
      this.isRenetAvailable(),
      this.isBridgeVMReachable(),
      this.isWorkerVMReachable(),
    ]);

    return { renet, bridgeVM, workerVM };
  }

  /**
   * Ensure infrastructure is ready for tests.
   * - Builds renet if not available or if RENET_AUTO_BUILD=true
   * - Starts VMs if not running
   * - Deploys renet to VMs if outdated
   */
  async ensureInfrastructure(): Promise<void> {
    console.log('Checking infrastructure status...');

    let status = await this.getStatus();
    console.log('');
    console.log('Initial Status:');
    console.log('  Renet:', status.renet.available ? `OK (${status.renet.path})` : 'NOT FOUND');
    console.log('  Bridge VM:', status.bridgeVM ? 'OK' : 'DOWN');
    console.log('  Worker VM:', status.workerVM ? 'OK' : 'DOWN');

    // Build renet if not available or if auto-build is enabled
    const autoBuild = process.env.RENET_AUTO_BUILD !== 'false';
    if (!status.renet.available || autoBuild) {
      console.log('');
      try {
        const buildResult = await this.buildRenet();
        this.detectedRenetPath = buildResult.path;
        status = await this.getStatus();
      } catch (error: any) {
        if (!status.renet.available) {
          throw new Error(
            `Renet binary not found and build failed: ${error.message}\n` +
            'Build manually with: cd renet && go build -o bin/renet ./cmd/renet\n' +
            'Or set RENET_PATH environment variable.'
          );
        }
        // Build failed but we have an existing binary
        console.log(`  Warning: Build failed (${error.message}), using existing binary`);
      }
    }

    // Always ensure VMs are running
    const vmsReady = status.bridgeVM && status.workerVM;

    if (!vmsReady) {
      console.log('');
      console.log('VMs not ready - starting via ops scripts...');

      const result = await this.opsManager.ensureVMsRunning();

      if (!result.success) {
        throw new Error(
          `Failed to start VMs: ${result.message}\n` +
          'Check ops logs for details.'
        );
      }

      console.log(result.message);

      // Verify VMs are now ready
      const newStatus = await this.getStatus();
      console.log('');
      console.log('Updated Status:');
      console.log('  Bridge VM:', newStatus.bridgeVM ? 'OK' : 'DOWN');
      console.log('  Worker VM:', newStatus.workerVM ? 'OK' : 'DOWN');

      if (!newStatus.bridgeVM || !newStatus.workerVM) {
        const missing: string[] = [];
        if (!newStatus.bridgeVM) missing.push('bridge VM');
        if (!newStatus.workerVM) missing.push('worker VM');

        throw new Error(
          `VMs started but still not reachable: ${missing.join(', ')}\n` +
          'Check network connectivity and SSH configuration.'
        );
      }
    }

    // Verify renet is installed on worker VMs
    await this.verifyRenetOnVMs();
  }

  /**
   * Build renet binary if source has changed.
   */
  async buildRenet(): Promise<{ built: boolean; path: string }> {
    const renetDir = path.join(this.config.monorepoRoot, 'renet');
    const binaryPath = path.join(renetDir, 'bin', 'renet');

    console.log('Building renet binary...');

    try {
      const { stdout, stderr } = await execAsync(
        'go build -o bin/renet ./cmd/renet',
        { cwd: renetDir, timeout: 120000 }
      );

      if (stderr && !stderr.includes('warning')) {
        console.log('  Build warnings:', stderr.trim());
      }

      console.log('  ✓ Build complete');
      return { built: true, path: binaryPath };
    } catch (error: any) {
      throw new Error(`Failed to build renet: ${error.message}`);
    }
  }

  /**
   * Get MD5 hash of renet binary on a remote VM.
   */
  private async getRemoteRenetMD5(ip: string): Promise<string | null> {
    const result = await this.opsManager.executeOnVM(ip, `md5sum ${RENET_BINARY_PATH} 2>/dev/null | cut -d" " -f1`);
    if (result.code === 0 && result.stdout.trim().length === 32) {
      return result.stdout.trim();
    }
    return null;
  }

  /**
   * Deploy renet binary to a VM if it's different from the local version.
   * Verifies the deployment by checking MD5 after copy.
   */
  private async deployRenetToVM(ip: string, localPath: string, localMD5: string): Promise<boolean> {
    const remoteMD5 = await this.getRemoteRenetMD5(ip);

    if (remoteMD5 === localMD5) {
      return false; // Already up to date
    }

    // Deploy via scp to temp then sudo mv
    const user = process.env.USER;
    if (!user) {
      throw new Error('USER environment variable is not set');
    }
    try {
      // Copy to temp location
      await execAsync(
        `scp -q -o StrictHostKeyChecking=no "${localPath}" ${user}@${ip}:/tmp/renet`,
        { timeout: 60000 }  // Increased timeout for larger binaries
      );

      // Move to final location and set permissions
      await execAsync(
        `ssh -q -o StrictHostKeyChecking=no ${user}@${ip} "sudo mv /tmp/renet ${RENET_BINARY_PATH} && sudo chmod +x ${RENET_BINARY_PATH}"`,
        { timeout: 10000 }
      );

      // Verify the deployment by checking MD5
      const newRemoteMD5 = await this.getRemoteRenetMD5(ip);
      if (newRemoteMD5 !== localMD5) {
        throw new Error(`MD5 mismatch after deploy: local=${localMD5}, remote=${newRemoteMD5}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to deploy renet to ${ip}: ${error.message}`);
    }
  }

  /**
   * Verify renet is installed and up-to-date on all VMs (bridge, workers, ceph).
   * Deploys the local version if VMs have outdated binary.
   */
  private async verifyRenetOnVMs(): Promise<void> {
    console.log('');
    console.log('Verifying renet on all VMs...');

    const localPath = this.getRenetPath();
    let localMD5: string;

    try {
      localMD5 = getFileMD5(localPath);
    } catch {
      throw new Error(`Cannot read local renet binary at ${localPath}`);
    }

    // Deploy to all VMs: bridge + workers + ceph
    const allIPs = this.opsManager.getAllVMIps();

    for (const ip of allIPs) {
      const hasRenet = await this.opsManager.isRenetInstalledOnVM(ip);

      if (!hasRenet) {
        // Install renet for the first time
        console.log(`  ${ip}: Installing renet...`);
        await this.deployRenetToVM(ip, localPath, localMD5);
        const version = await this.opsManager.getRenetVersionOnVM(ip);
        console.log(`  ✓ ${ip}: renet installed (${version || 'unknown version'})`);
      } else {
        // Check if update is needed
        const wasUpdated = await this.deployRenetToVM(ip, localPath, localMD5);
        const version = await this.opsManager.getRenetVersionOnVM(ip);

        if (wasUpdated) {
          console.log(`  ✓ ${ip}: renet updated (${version || 'unknown version'})`);
        } else {
          console.log(`  ✓ ${ip}: renet installed (${version || 'unknown version'})`);
        }
      }
    }
  }

  /**
   * Get the OpsManager instance for direct VM operations.
   */
  getOpsManager(): OpsManager {
    return this.opsManager;
  }
}
