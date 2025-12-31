import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * VM Network Configuration
 * Matches ops/scripts/init.sh configuration pattern
 */
export interface VMNetworkConfig {
  netBase: string;      // VM_NET_BASE - Network prefix (e.g., "192.168.111")
  netOffset: number;    // VM_NET_OFFSET - Offset added to VM ID
  bridgeId: number;     // VM_BRIDGE - Bridge VM ID
  workerIds: number[];  // VM_WORKERS - Worker VM IDs
  cephIds: number[];    // VM_CEPH_NODES - Ceph node IDs (optional)
}

/**
 * OpsManager - Manages VMs via /home/muhammed/monorepo/ops scripts
 *
 * Provides methods to:
 * - Calculate VM IPs dynamically (matches ops/scripts/init.sh pattern)
 * - Check if VMs are running
 * - Start VMs if needed
 * - Wait for VMs to be ready
 * - Stop VMs
 *
 * IP Calculation: VM_NET_BASE + "." + (VM_NET_OFFSET + VM_ID)
 * Example: 192.168.111 + "." + (0 + 11) = 192.168.111.11
 */
export class OpsManager {
  private opsDir: string;
  private monorepoRoot: string;
  private config: VMNetworkConfig;
  private sshOptions: string;

  constructor() {
    const monorepoRoot = process.env.MONOREPO_ROOT;
    if (!monorepoRoot) {
      throw new Error('MONOREPO_ROOT environment variable is required');
    }
    this.monorepoRoot = monorepoRoot;
    this.opsDir = `${this.monorepoRoot}/ops`;
    this.sshOptions = '-q -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5';

    // Load configuration from environment (matches ops/scripts/init.sh)
    this.config = this.loadConfig();
  }

  /**
   * Load VM network configuration from environment variables.
   * Matches the pattern in ops/scripts/init.sh
   * STRICT: All environment variables are required, no defaults.
   */
  private loadConfig(): VMNetworkConfig {
    const netBase = process.env.VM_NET_BASE;
    if (!netBase) {
      throw new Error('VM_NET_BASE environment variable is required');
    }

    const netOffsetStr = process.env.VM_NET_OFFSET;
    if (netOffsetStr === undefined) {
      throw new Error('VM_NET_OFFSET environment variable is required');
    }
    const netOffset = parseInt(netOffsetStr, 10);

    const bridgeIdStr = process.env.VM_BRIDGE;
    if (!bridgeIdStr) {
      throw new Error('VM_BRIDGE environment variable is required');
    }
    const bridgeId = parseInt(bridgeIdStr, 10);

    // Parse worker IDs from space-separated string
    const workersStr = process.env.VM_WORKERS;
    if (!workersStr) {
      throw new Error('VM_WORKERS environment variable is required');
    }
    const workerIds = workersStr.split(/\s+/).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (workerIds.length === 0) {
      throw new Error('VM_WORKERS must contain at least one worker ID');
    }

    // Parse ceph node IDs (required for Ceph tests)
    const cephStr = process.env.VM_CEPH_NODES;
    if (!cephStr) {
      throw new Error('VM_CEPH_NODES environment variable is required');
    }
    const cephIds = cephStr.split(/\s+/).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (cephIds.length === 0) {
      throw new Error('VM_CEPH_NODES must contain at least one Ceph node ID');
    }

    return { netBase, netOffset, bridgeId, workerIds, cephIds };
  }

  /**
   * Calculate VM IP address from VM ID.
   * Formula: VM_NET_BASE + "." + (VM_NET_OFFSET + VM_ID)
   */
  calculateVMIp(vmId: number): string {
    return `${this.config.netBase}.${this.config.netOffset + vmId}`;
  }

  /**
   * Get bridge VM IP
   */
  getBridgeVMIp(): string {
    return this.calculateVMIp(this.config.bridgeId);
  }

  /**
   * Get worker VM IPs
   */
  getWorkerVMIps(): string[] {
    return this.config.workerIds.map((id) => this.calculateVMIp(id));
  }

  /**
   * Get Ceph node IPs
   */
  getCephVMIps(): string[] {
    return this.config.cephIds.map((id) => this.calculateVMIp(id));
  }

  /**
   * Get all VM IPs (bridge + workers)
   */
  getVMIps(): string[] {
    return [this.getBridgeVMIp(), ...this.getWorkerVMIps()];
  }

  /**
   * Get all VM IPs including Ceph nodes
   */
  getAllVMIps(): string[] {
    return [...this.getVMIps(), ...this.getCephVMIps()];
  }

  /**
   * Get VM IDs configuration
   */
  getVMIds(): { bridge: number; workers: number[]; ceph: number[] } {
    return {
      bridge: this.config.bridgeId,
      workers: this.config.workerIds,
      ceph: this.config.cephIds,
    };
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): VMNetworkConfig {
    return { ...this.config };
  }

  /**
   * Check if a VM is reachable via ping
   */
  async isVMReachable(ip: string, timeoutSeconds: number = 2): Promise<boolean> {
    try {
      await execAsync(`ping -c 1 -W ${timeoutSeconds} ${ip}`, { timeout: (timeoutSeconds + 1) * 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if SSH is available on a VM
   */
  async isSSHReady(ip: string): Promise<boolean> {
    try {
      const user = process.env.USER;
      if (!user) {
        throw new Error('USER environment variable is not set');
      }
      await execAsync(`ssh ${this.sshOptions} ${user}@${ip} "echo ready"`, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if all VMs are running and reachable
   */
  async areAllVMsReady(): Promise<{ ready: boolean; status: Map<string, { reachable: boolean; sshReady: boolean }> }> {
    const status = new Map<string, { reachable: boolean; sshReady: boolean }>();
    let allReady = true;

    for (const ip of this.getVMIps()) {
      const reachable = await this.isVMReachable(ip);
      const sshReady = reachable ? await this.isSSHReady(ip) : false;
      status.set(ip, { reachable, sshReady });

      if (!reachable || !sshReady) {
        allReady = false;
      }
    }

    return { ready: allReady, status };
  }

  /**
   * Check if worker VMs are ready (bridge not required for some tests)
   */
  async areWorkerVMsReady(): Promise<{ ready: boolean; status: Map<string, { reachable: boolean; sshReady: boolean }> }> {
    const status = new Map<string, { reachable: boolean; sshReady: boolean }>();
    let allReady = true;

    for (const ip of this.getWorkerVMIps()) {
      const reachable = await this.isVMReachable(ip);
      const sshReady = reachable ? await this.isSSHReady(ip) : false;
      status.set(ip, { reachable, sshReady });

      if (!reachable || !sshReady) {
        allReady = false;
      }
    }

    return { ready: allReady, status };
  }

  /**
   * Run an ops command
   */
  async runOpsCommand(command: string, args: string[] = [], timeoutMs: number = 300000): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const fullCommand = `./go ${command} ${args.join(' ')}`.trim();
      console.log(`[OpsManager] Running: ${fullCommand}`);

      const childProcess = spawn('./go', [command, ...args], {
        cwd: this.opsDir,
        shell: true,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        // Stream output for visibility
        console.log(`[ops] ${data.toString().trim()}`);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.error(`[ops:err] ${data.toString().trim()}`);
      });

      const timeout = setTimeout(() => {
        childProcess.kill('SIGTERM');
        resolve({ stdout, stderr: stderr + '\nTimeout exceeded', code: -1 });
      }, timeoutMs);

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, code: code ?? 0 });
      });

      childProcess.on('error', (err: Error) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr: err.message, code: -1 });
      });
    });
  }

  /**
   * Get ops status
   */
  async getStatus(): Promise<{ stdout: string; stderr: string; code: number }> {
    return this.runOpsCommand('status', [], 30000);
  }

  /**
   * Start VMs using ops scripts
   * @param options - Start options
   * @param options.force - Force restart even if VMs are running
   * @param options.basic - Only start bridge + first worker
   * @param options.parallel - Start VMs in parallel (faster)
   */
  async startVMs(options: { force?: boolean; basic?: boolean; parallel?: boolean } = {}): Promise<{ success: boolean; stdout: string; stderr: string }> {
    const args: string[] = [];

    if (options.force) args.push('--force');
    if (options.basic) args.push('--basic');
    if (options.parallel) args.push('--parallel');

    console.log('[OpsManager] Starting VMs...');
    const result = await this.runOpsCommand('up_systems', args, 600000); // 10 minute timeout

    return {
      success: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  /**
   * Stop all VMs
   */
  async stopVMs(): Promise<{ success: boolean; stdout: string; stderr: string }> {
    console.log('[OpsManager] Stopping VMs...');
    const result = await this.runOpsCommand('down_systems', [], 120000); // 2 minute timeout

    return {
      success: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  /**
   * Wait for a VM to be ready (ping + SSH)
   */
  async waitForVM(ip: string, timeoutMs: number = 120000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 5000; // 5 seconds

    console.log(`[OpsManager] Waiting for VM ${ip} to be ready...`);

    while (Date.now() - startTime < timeoutMs) {
      const reachable = await this.isVMReachable(ip);
      if (reachable) {
        const sshReady = await this.isSSHReady(ip);
        if (sshReady) {
          console.log(`[OpsManager] VM ${ip} is ready`);
          return true;
        }
      }

      await this.sleep(checkInterval);
    }

    console.log(`[OpsManager] Timeout waiting for VM ${ip}`);
    return false;
  }

  /**
   * Wait for all VMs to be ready
   */
  async waitForAllVMs(timeoutMs: number = 180000): Promise<boolean> {
    console.log('[OpsManager] Waiting for all VMs to be ready...');

    // Wait for all VMs including Ceph nodes
    const promises = this.getAllVMIps().map((ip) => this.waitForVM(ip, timeoutMs));
    const results = await Promise.all(promises);

    return results.every((ready) => ready);
  }

  /**
   * Wait for worker VMs to be ready
   */
  async waitForWorkerVMs(timeoutMs: number = 180000): Promise<boolean> {
    console.log('[OpsManager] Waiting for worker VMs to be ready...');

    const promises = this.getWorkerVMIps().map((ip) => this.waitForVM(ip, timeoutMs));
    const results = await Promise.all(promises);

    return results.every((ready) => ready);
  }

  /**
   * Ensure VMs are running - start them if not
   */
  async ensureVMsRunning(options: { basic?: boolean } = {}): Promise<{ success: boolean; wasStarted: boolean; message: string }> {
    // First check if VMs are already ready
    const { ready, status } = await this.areAllVMsReady();

    if (ready) {
      return {
        success: true,
        wasStarted: false,
        message: 'All VMs are already running and ready',
      };
    }

    // Log which VMs are not ready
    console.log('[OpsManager] Some VMs are not ready:');
    for (const [ip, vmStatus] of status) {
      if (!vmStatus.reachable || !vmStatus.sshReady) {
        console.log(`  - ${ip}: reachable=${vmStatus.reachable}, sshReady=${vmStatus.sshReady}`);
      }
    }

    // Try to start VMs
    console.log('[OpsManager] Starting VMs...');
    const startResult = await this.startVMs({ basic: options.basic });

    if (!startResult.success) {
      return {
        success: false,
        wasStarted: false,
        message: `Failed to start VMs: ${startResult.stderr}`,
      };
    }

    // Wait for VMs to be ready
    const allReady = await this.waitForAllVMs();

    if (!allReady) {
      return {
        success: false,
        wasStarted: true,
        message: 'VMs started but not all became ready in time',
      };
    }

    return {
      success: true,
      wasStarted: true,
      message: 'VMs started successfully and are ready',
    };
  }

  /**
   * Execute a command on a remote VM via SSH
   */
  async executeOnVM(ip: string, command: string, timeoutMs: number = 60000): Promise<{ stdout: string; stderr: string; code: number }> {
    const user = process.env.USER;
    if (!user) {
      throw new Error('USER environment variable is not set');
    }
    const sshCommand = `ssh ${this.sshOptions} ${user}@${ip} "${command.replace(/"/g, '\\"')}"`;

    try {
      const { stdout, stderr } = await execAsync(sshCommand, { timeout: timeoutMs });
      return { stdout, stderr, code: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        code: error.code || 1,
      };
    }
  }

  /**
   * Execute a command on all worker VMs in parallel
   */
  async executeOnAllWorkers(command: string, timeoutMs: number = 60000): Promise<Map<string, { stdout: string; stderr: string; code: number }>> {
    const results = new Map<string, { stdout: string; stderr: string; code: number }>();

    const promises = this.getWorkerVMIps().map(async (ip) => {
      const result = await this.executeOnVM(ip, command, timeoutMs);
      return { ip, result };
    });

    const execResults = await Promise.all(promises);
    for (const { ip, result } of execResults) {
      results.set(ip, result);
    }

    return results;
  }

  /**
   * Check if renet is installed on a VM
   */
  async isRenetInstalledOnVM(ip: string): Promise<boolean> {
    const result = await this.executeOnVM(ip, 'which renet || command -v renet');
    return result.code === 0 && result.stdout.trim().length > 0;
  }

  /**
   * Get renet version on a VM
   */
  async getRenetVersionOnVM(ip: string): Promise<string | null> {
    const result = await this.executeOnVM(ip, 'renet version 2>/dev/null || renet --version 2>/dev/null');
    if (result.code === 0) {
      return result.stdout.trim();
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Soft reset VMs by force restarting them.
   * Calls: ./go up_systems --force --parallel
   * This ensures a clean state before tests.
   */
  async resetVMs(): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();

    console.log('[OpsManager] Performing soft reset (./go up_systems --force --parallel)...');
    const result = await this.runOpsCommand('up_systems', ['--force', '--parallel'], 300000); // 5 min timeout

    // Note: The OPS command may return non-zero if middleware auth fails (rdc not found),
    // but VMs may still be successfully created. We verify actual VM readiness below.
    if (result.code !== 0) {
      console.log('[OpsManager] OPS command returned non-zero, verifying VM readiness anyway...');
    }

    // Wait for all VMs to be ready after reset - this is the real success criteria
    console.log('[OpsManager] Waiting for VMs to be ready after reset...');
    const allReady = await this.waitForAllVMs(180000);

    if (!allReady) {
      console.error('[OpsManager] VMs did not become ready after reset');
      return { success: false, duration: Date.now() - startTime };
    }

    console.log(`[OpsManager] VM reset completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    return { success: true, duration: Date.now() - startTime };
  }

  /**
   * Verify all VMs (bridge + workers + ceph) are ready.
   * Throws an error if any VM is not reachable or SSH is not available.
   * STRICT: No graceful fallback, tests cannot proceed if VMs are not ready.
   */
  async verifyAllVMsReady(): Promise<void> {
    const allIPs = this.getAllVMIps();
    const notReady: string[] = [];

    console.log('[OpsManager] Verifying all VMs are ready...');

    for (const ip of allIPs) {
      const reachable = await this.isVMReachable(ip);
      if (!reachable) {
        notReady.push(`${ip} (not reachable)`);
        continue;
      }

      const sshReady = await this.isSSHReady(ip);
      if (!sshReady) {
        notReady.push(`${ip} (SSH not ready)`);
        continue;
      }

      // Check renet is installed
      const renetInstalled = await this.isRenetInstalledOnVM(ip);
      if (!renetInstalled) {
        notReady.push(`${ip} (renet not installed)`);
        continue;
      }

      const version = await this.getRenetVersionOnVM(ip);
      console.log(`  ✓ ${ip}: renet ${version}`);
    }

    if (notReady.length > 0) {
      throw new Error(`VMs not ready: ${notReady.join(', ')}`);
    }

    console.log('[OpsManager] All VMs verified and ready');
  }
}

// Singleton instance for shared state across tests
let opsManagerInstance: OpsManager | null = null;

export function getOpsManager(): OpsManager {
  if (!opsManagerInstance) {
    opsManagerInstance = new OpsManager();
  }
  return opsManagerInstance;
}
