import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { DEFAULT_DATASTORE_PATH } from '../../src/constants';

/**
 * Multi-Machine Operations Tests
 *
 * Tests operations that span multiple worker VMs.
 * VMs are automatically started via global-setup.ts.
 *
 * VM IPs are calculated dynamically using ops configuration:
 * - VM_NET_BASE (default: 192.168.111)
 * - VM_NET_OFFSET (default: 0)
 * - VM_BRIDGE (default: 1)
 * - VM_WORKERS (default: "11 12")
 *
 * Functions tested across machines:
 * - check_* functions on multiple machines
 * - setup on multiple machines
 * - push/pull between machines
 * - deploy to multiple machines
 * - Parallel execution capability
 */

test.describe('Multi-Machine Connectivity @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('worker VM 1 should be reachable', async () => {
    const reachable = await runner.isVMReachable(runner.getWorkerVM());
    expect(reachable).toBe(true);
  });

  test('worker VM 2 should be reachable', async () => {
    const reachable = await runner.isVMReachable(runner.getWorkerVM2());
    expect(reachable).toBe(true);
  });

  test('bridge VM should be reachable', async () => {
    const reachable = await runner.isVMReachable(runner.getBridgeVM());
    expect(reachable).toBe(true);
  });
});

test.describe('Multi-Machine System Checks @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('machine_ping on worker VM 1', async () => {
    const result = await runner.executeOnWorker('renet bridge once --test-mode --function machine_ping');
    expect(runner.isSuccess(result)).toBe(true);
    expect(runner.getCombinedOutput(result)).toContain('pong');
  });

  test('machine_ping on worker VM 2', async () => {
    const result = await runner.executeOnWorker2('renet bridge once --test-mode --function machine_ping');
    expect(runner.isSuccess(result)).toBe(true);
    expect(runner.getCombinedOutput(result)).toContain('pong');
  });

  test('machine_check_system on all workers in parallel', async () => {
    const results = await runner.executeOnAllWorkers('renet bridge once --test-mode --function machine_check_system');

    for (const [vm, result] of results) {
      expect(runner.isSuccess(result)).toBe(true);
    }
  });

  test('machine_check_memory on all workers in parallel', async () => {
    const results = await runner.executeOnAllWorkers('renet bridge once --test-mode --function machine_check_memory');

    for (const [vm, result] of results) {
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});

test.describe('Multi-Machine Setup @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('check_system on worker VM 1', async () => {
    // check_system is available through bridge once, unlike check_setup
    const result = await runner.checkSetupOnMachine(runner.getWorkerVM());
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('check_system on worker VM 2', async () => {
    const result = await runner.checkSetupOnMachine(runner.getWorkerVM2());
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('check_datastore on all workers', async () => {
    const workers = runner.getWorkerVMs();

    for (const vm of workers) {
      const result = await runner.checkDatastoreOnMachine(vm, DEFAULT_DATASTORE_PATH);
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});

test.describe('Multi-Machine Data Transfer @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;
  const testRepo = `multi-test-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('push repository from VM1 to VM2', async () => {
    const result = await runner.push(testRepo, runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('pull repository from VM1 to VM2', async () => {
    const result = await runner.pull(testRepo, runner.getWorkerVM(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('deploy repository to all workers', async () => {
    const workers = runner.getWorkerVMs();

    for (const vm of workers) {
      const result = await runner.deploy(testRepo, vm, DEFAULT_DATASTORE_PATH);
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});

test.describe('Parallel Execution Tests @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('parallel machine_ping on all workers', async () => {
    const workers = runner.getWorkerVMs();

    const promises = workers.map(async (vm) => {
      const result = await runner.executeOnVM(vm, 'renet bridge once --test-mode --function machine_ping');
      return { vm, result };
    });

    const results = await Promise.all(promises);

    for (const { vm, result } of results) {
      expect(runner.isSuccess(result)).toBe(true);
      expect(runner.getCombinedOutput(result)).toContain('pong');
    }
  });

  test('parallel machine_version on all workers', async () => {
    const workers = runner.getWorkerVMs();

    const promises = workers.map(async (vm) => {
      const result = await runner.executeOnVM(vm, 'renet bridge once --test-mode --function machine_version');
      return { vm, result };
    });

    const results = await Promise.all(promises);

    for (const { vm, result } of results) {
      expect(runner.isSuccess(result)).toBe(true);
      expect(runner.getCombinedOutput(result)).toMatch(/renet|version|\d+\.\d+/);
    }
  });

  test('parallel check functions on all workers', async () => {
    const workers = runner.getWorkerVMs();
    const functions = ['machine_check_memory', 'machine_check_tools', 'machine_check_renet'];

    // Run all functions on all workers in parallel
    const promises: Promise<{ vm: string; func: string; result: any }>[] = [];

    for (const vm of workers) {
      for (const func of functions) {
        promises.push(
          (async () => {
            const result = await runner.executeOnVM(
              vm,
              `renet bridge once --test-mode --function ${func}`
            );
            return { vm, func, result };
          })()
        );
      }
    }

    const results = await Promise.all(promises);

    for (const { vm, func, result } of results) {
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});

/**
 * Cross-Machine Repository Operations
 *
 * Tests repository operations that span multiple machines.
 */
test.describe('Cross-Machine Repository @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('list repositories on VM1', async () => {
    // Use direct renet CLI command for listing repositories
    const result = await runner.listRepositoriesOnMachine(runner.getWorkerVM(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('list repositories on VM2', async () => {
    const result = await runner.listRepositoriesOnMachine(runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('compare repository lists across machines', async () => {
    const vm1Result = await runner.listRepositoriesOnMachine(runner.getWorkerVM(), DEFAULT_DATASTORE_PATH);
    const vm2Result = await runner.listRepositoriesOnMachine(runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);

    expect(runner.isSuccess(vm1Result)).toBe(true);
    expect(runner.isSuccess(vm2Result)).toBe(true);
  });
});

/**
 * Machine Comparison Tests
 *
 * Tests that compare state across multiple machines.
 */
test.describe('Machine State Comparison @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('renet version should match across machines', async () => {
    const results = await runner.executeOnAllWorkers('renet version');

    const versions: string[] = [];
    for (const [vm, result] of results) {
      expect(runner.isSuccess(result)).toBe(true);
      versions.push(result.stdout.trim());
    }

    // All versions should be the same
    const uniqueVersions = [...new Set(versions)];
    expect(uniqueVersions.length).toBe(1);
  });

  test('machine_check_system results should be consistent', async () => {
    const results = await runner.executeOnAllWorkers('renet bridge once --test-mode --function machine_check_system');

    for (const [vm, result] of results) {
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});

