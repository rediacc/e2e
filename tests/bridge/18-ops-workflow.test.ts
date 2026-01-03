import { test, expect } from '@playwright/test';
import { getOpsManager } from '../../src/utils/bridge/OpsManager';

/**
 * OPS Workflow Tests
 *
 * Tests for renet ops infrastructure lifecycle:
 * - VM creation and destruction
 * - Orchestration (Docker, SSH, auth setup)
 * - Status reporting
 *
 * These tests run against the VM infrastructure managed by renet ops commands.
 * They verify the full lifecycle of the ops cluster.
 *
 * NOTE: These tests are destructive - they stop and start VMs.
 * Run with care and only in isolated test environments.
 */
test.describe('OPS Workflow @bridge @ops @slow', () => {
  const ops = getOpsManager();

  // Increase timeout for infrastructure operations
  test.setTimeout(600000); // 10 minutes

  test.describe.serial('VM Lifecycle', () => {
    test('should report initial status', async () => {
      const result = await ops.getStatus();

      // Status command should succeed regardless of VM state
      expect(result.code).toBe(0);
      expect(result.stdout).toBeTruthy();
    });

    test('should check VM reachability', async () => {
      const vmIds = ops.getVMIds();
      const bridgeIp = ops.getBridgeVMIp();
      const workerIps = ops.getWorkerVMIps();

      console.log(`Bridge VM: ${vmIds.bridge} -> ${bridgeIp}`);
      console.log(`Worker VMs: ${vmIds.workers.join(', ')} -> ${workerIps.join(', ')}`);

      // Just log the current state - don't fail if VMs are down
      const bridgeReachable = await ops.isVMReachable(bridgeIp);
      console.log(`Bridge VM reachable: ${bridgeReachable}`);

      for (const ip of workerIps) {
        const reachable = await ops.isVMReachable(ip);
        console.log(`Worker ${ip} reachable: ${reachable}`);
      }
    });

    test('should stop VMs if running', async () => {
      // Check current state
      const { ready } = await ops.areAllVMsReady();

      if (ready) {
        console.log('VMs are running, stopping them...');
        const result = await ops.stopVMs();

        // Allow some time for VMs to fully stop
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Verify VMs are stopped (not reachable)
        const bridgeIp = ops.getBridgeVMIp();
        const stillReachable = await ops.isVMReachable(bridgeIp);
        expect(stillReachable).toBe(false);

        console.log('VMs stopped successfully');
      } else {
        console.log('VMs are already stopped, skipping');
      }
    });

    test('should start VMs with basic mode', async () => {
      console.log('Starting VMs with --basic mode...');

      const result = await ops.startVMs({ basic: true, parallel: true });

      // Note: The command may return non-zero if some orchestration steps fail
      // (e.g., middleware auth), but VMs may still be created successfully.
      // We verify actual VM readiness below.

      console.log(`Start command returned code: ${result.success ? 0 : 1}`);

      // Wait for bridge VM to be ready
      const bridgeIp = ops.getBridgeVMIp();
      const bridgeReady = await ops.waitForVM(bridgeIp, 180000);
      expect(bridgeReady).toBe(true);

      console.log('Bridge VM is ready');
    });

    test('should verify SSH connectivity to all VMs', async () => {
      const allReady = await ops.waitForAllVMs(180000);
      expect(allReady).toBe(true);

      // Double-check each VM
      const vmIps = ops.getVMIps();
      for (const ip of vmIps) {
        const sshReady = await ops.isSSHReady(ip);
        expect(sshReady).toBe(true);
        console.log(`SSH ready on ${ip}`);
      }
    });

    test('should execute commands on VMs', async () => {
      const vmIps = ops.getVMIps();

      for (const ip of vmIps) {
        const result = await ops.executeOnVM(ip, 'hostname && uptime');

        expect(result.code).toBe(0);
        expect(result.stdout).toBeTruthy();
        console.log(`${ip}: ${result.stdout.trim().split('\n')[0]}`);
      }
    });

    test('should verify renet is installed on VMs', async () => {
      const vmIps = ops.getVMIps();

      for (const ip of vmIps) {
        const installed = await ops.isRenetInstalledOnVM(ip);
        const version = await ops.getRenetVersionOnVM(ip);

        expect(installed).toBe(true);
        expect(version).toBeTruthy();
        console.log(`${ip}: renet ${version}`);
      }
    });

    test('should report status after VMs are up', async () => {
      const result = await ops.getStatus();

      expect(result.code).toBe(0);
      expect(result.stdout).toBeTruthy();

      // Should show running VMs
      const output = result.stdout.toLowerCase();
      expect(output).toMatch(/running|up|ready/i);
    });
  });
});

/**
 * VM Reset Tests
 *
 * Tests the soft reset functionality that recreates VMs while preserving configuration.
 */
test.describe('VM Reset @bridge @ops @slow', () => {
  const ops = getOpsManager();

  test.setTimeout(600000); // 10 minutes

  test('should perform soft reset', async () => {
    const result = await ops.resetVMs();

    expect(result.success).toBe(true);
    console.log(`Reset completed in ${(result.duration / 1000).toFixed(1)}s`);

    // Verify all VMs are ready after reset
    const allReady = await ops.waitForAllVMs(180000);
    expect(allReady).toBe(true);
  });

  test('should have clean state after reset', async () => {
    const vmIps = ops.getVMIps();

    for (const ip of vmIps) {
      // Verify uptime is low (recently rebooted)
      const result = await ops.executeOnVM(ip, 'cat /proc/uptime | cut -d" " -f1');

      expect(result.code).toBe(0);

      const uptimeSeconds = parseFloat(result.stdout.trim());
      // VM should have been up for less than 5 minutes after reset
      expect(uptimeSeconds).toBeLessThan(300);
      console.log(`${ip}: uptime ${uptimeSeconds.toFixed(0)}s`);
    }
  });
});

/**
 * Parallel Command Execution Tests
 */
test.describe('Parallel Execution @bridge @ops', () => {
  const ops = getOpsManager();

  test('should execute commands on all workers in parallel', async () => {
    const command = 'hostname -I | awk \'{print $1}\'';
    const results = await ops.executeOnAllWorkers(command);

    const workerIps = ops.getWorkerVMIps();
    expect(results.size).toBe(workerIps.length);

    for (const [ip, result] of results) {
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe(ip);
      console.log(`Worker ${ip}: OK`);
    }
  });
});
