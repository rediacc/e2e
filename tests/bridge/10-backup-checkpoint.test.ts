import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { DEFAULT_DATASTORE_PATH } from '../../src/constants';

/**
 * Backup/Checkpoint Operations Tests (6 functions)
 *
 * Tests backup, deploy, push, pull, and checkpoint functions.
 * These functions handle data transfer between machines and state preservation.
 *
 * Functions tested:
 * - backup_push (send repository to remote machine)
 * - backup_pull (receive repository from remote machine)
 * - backup_create (create backup of repository)
 * - backup_deploy (deploy repository to machine)
 * - checkpoint_create
 * - checkpoint_restore
 *
 * Note: checkpoint_list, checkpoint_info, checkpoint_delete are not implemented in Go.
 * Available checkpoint functions: checkpoint_create, checkpoint_restore, checkpoint_validate, checkpoint_cleanup, checkpoint_check_compat
 *
 * VMs are automatically started via global-setup.ts.
 */
test.describe('Backup Operations @bridge', () => {
  let runner: BridgeTestRunner;
  const testRepo = 'backup-test-repo';

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('push should not have shell syntax errors', async () => {
    const result = await runner.push(testRepo, runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('pull should not have shell syntax errors', async () => {
    const result = await runner.pull(testRepo, runner.getWorkerVM(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('backup should not have shell syntax errors', async () => {
    const result = await runner.backup(testRepo, DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('deploy should not have shell syntax errors', async () => {
    const result = await runner.deploy(testRepo, runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

test.describe('Checkpoint Operations @bridge', () => {
  let runner: BridgeTestRunner;
  const testRepo = 'checkpoint-test-repo';
  const checkpointName = `ckpt-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('checkpoint_create should not have shell syntax errors', async () => {
    const result = await runner.checkpointCreate(testRepo, checkpointName, DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('checkpoint_restore should not have shell syntax errors', async () => {
    const result = await runner.checkpointRestore(testRepo, checkpointName, DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Checkpoint Lifecycle Tests
 *
 * Tests the checkpoint create/restore lifecycle.
 * Note: checkpoint_list, checkpoint_info, checkpoint_delete are not implemented in Go.
 */
test.describe.serial('Checkpoint Lifecycle @bridge @lifecycle', () => {
  let runner: BridgeTestRunner;
  const repoName = `ckpt-lifecycle-${Date.now()}`;
  const checkpoint1 = `ckpt1-${Date.now()}`;
  const checkpoint2 = `ckpt2-${Date.now()}`;
  const datastorePath = DEFAULT_DATASTORE_PATH;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('1. checkpoint_create: create first checkpoint', async () => {
    const result = await runner.checkpointCreate(repoName, checkpoint1, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2. checkpoint_create: create second checkpoint', async () => {
    const result = await runner.checkpointCreate(repoName, checkpoint2, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('3. checkpoint_restore: restore to checkpoint1', async () => {
    const result = await runner.checkpointRestore(repoName, checkpoint1, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Backup/Checkpoint Error Handling Tests
 *
 * Tests error handling for backup and checkpoint operations.
 */
test.describe('Backup/Checkpoint Error Handling @bridge', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('push to unreachable machine should handle gracefully', async () => {
    const result = await runner.push('test-repo', '10.0.0.254', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('pull from unreachable machine should handle gracefully', async () => {
    const result = await runner.pull('test-repo', '10.0.0.254', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('backup nonexistent repository should handle gracefully', async () => {
    const result = await runner.backup('nonexistent-repo-xyz', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('restore nonexistent checkpoint should handle gracefully', async () => {
    const result = await runner.checkpointRestore('test-repo', 'nonexistent-ckpt', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Push/Pull Multi-Machine Tests
 *
 * Tests data transfer between multiple machines.
 * VMs are automatically started via global-setup.ts.
 */
test.describe('Multi-Machine Backup Operations @bridge @multi-machine', () => {
  let runner: BridgeTestRunner;
  const repoName = `multi-backup-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('push from VM1 to VM2', async () => {
    const result = await runner.push(repoName, runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('pull from VM1 to VM2', async () => {
    const result = await runner.pull(repoName, runner.getWorkerVM(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('deploy to multiple machines', async () => {
    const machines = runner.getWorkerVMs();

    for (const machine of machines) {
      const result = await runner.deploy(repoName, machine, DEFAULT_DATASTORE_PATH);
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});

/**
 * Checkpoint Naming Tests
 *
 * Tests various checkpoint name formats.
 */
test.describe('Checkpoint Naming @bridge', () => {
  let runner: BridgeTestRunner;
  const repoName = 'ckpt-naming-test';

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('checkpoint with timestamp name should work', async () => {
    const name = `ckpt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const result = await runner.checkpointCreate(repoName, name, DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('checkpoint with simple name should work', async () => {
    const result = await runner.checkpointCreate(repoName, 'daily-backup', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('checkpoint with version name should work', async () => {
    const result = await runner.checkpointCreate(repoName, 'v1.0.0', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('checkpoint with underscores should work', async () => {
    const result = await runner.checkpointCreate(repoName, 'pre_release_v2', DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });
});
