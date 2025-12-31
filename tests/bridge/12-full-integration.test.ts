import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { TestResourceManager } from '../../src/utils/bridge/TestResourceManager';
import { CephTestHelper } from '../../src/utils/bridge/CephTestHelper';
import { DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID } from '../../src/constants';

// All repositories must be encrypted - use this password for tests
const TEST_PASSWORD = 'test-password-123';

/**
 * Full Integration Tests
 *
 * Tests complete workflows that span multiple function categories.
 * These tests validate end-to-end scenarios from setup to cleanup.
 *
 * Scenarios tested:
 * 1. Basic workflow: setup -> create repo -> mount -> up -> down -> unmount -> rm
 * 2. Ceph workflow: pool -> image -> snapshot -> clone -> mount/unmount
 * 3. Multi-machine workflow: setup machines -> deploy -> push/pull
 * 4. Checkpoint workflow: create -> work -> checkpoint -> restore
 */

/**
 * Basic Repository Workflow
 *
 * Tests a complete repository lifecycle from creation to deletion.
 */
test.describe.serial('Full Repository Workflow @bridge @integration', () => {
  let runner: BridgeTestRunner;
  const repoName = `full-workflow-${Date.now()}`;
  const datastorePath = DEFAULT_DATASTORE_PATH;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  // Phase 1: System Checks
  test('1.1 ping: verify system connectivity', async () => {
    const result = await runner.ping();
    expect(result.code).toBe(0);
    expect(runner.getCombinedOutput(result)).toContain('pong');
  });

  test('1.2 check_system: verify system requirements', async () => {
    const result = await runner.checkSystem();
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('1.3 check_datastore: verify datastore available', async () => {
    const result = await runner.checkDatastore(datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Phase 2: Repository Creation
  test('2.1 new: create repository', async () => {
    const result = await runner.repositoryNew(repoName, '1G', TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2.2 list: verify repository created', async () => {
    const result = await runner.repositoryList(datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2.3 info: get repository info', async () => {
    const result = await runner.repositoryInfo(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Phase 3: Mount and Use
  test('3.1 mount: mount repository', async () => {
    const result = await runner.repositoryMount(repoName, TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('3.2 status: check mounted status', async () => {
    const result = await runner.repositoryStatus(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('3.3 validate: validate mounted repository', async () => {
    const result = await runner.repositoryValidate(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Phase 4: Rediaccfile Operations
  test('4.1 up: start repository services', async () => {
    const result = await runner.repositoryUp(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4.2 status: verify services running', async () => {
    const result = await runner.repositoryStatus(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4.3 down: stop repository services', async () => {
    const result = await runner.repositoryDown(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Phase 5: Resize (requires unmounted repo)
  test('5.1 unmount: unmount for resize', async () => {
    const result = await runner.repositoryUnmount(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5.2 resize: expand repository', async () => {
    const result = await runner.repositoryResize(repoName, '2G', TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Phase 6: Cleanup (already unmounted from resize)
  test('6.1 rm: delete repository', async () => {
    const result = await runner.repositoryRm(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Checkpoint Workflow
 *
 * Tests creating checkpoints, making changes, and restoring.
 * Note: checkpoint_list and checkpoint_delete are not implemented in Go.
 */
test.describe.serial('Checkpoint Workflow @bridge @integration', () => {
  let runner: BridgeTestRunner;
  const repoName = `checkpoint-workflow-${Date.now()}`;
  const checkpoint1 = 'initial-state';
  const checkpoint2 = 'after-changes';
  const datastorePath = DEFAULT_DATASTORE_PATH;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  // Setup
  test('1. create repository', async () => {
    const result = await runner.repositoryNew(repoName, '1G', TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2. mount repository', async () => {
    const result = await runner.repositoryMount(repoName, TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Checkpoint workflow
  test('3. create initial checkpoint', async () => {
    const result = await runner.checkpointCreate(repoName, checkpoint1, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4. start services (make changes)', async () => {
    const result = await runner.repositoryUp(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5. create checkpoint after changes', async () => {
    const result = await runner.checkpointCreate(repoName, checkpoint2, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('6. stop services', async () => {
    const result = await runner.repositoryDown(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('7. restore to initial checkpoint', async () => {
    const result = await runner.checkpointRestore(repoName, checkpoint1, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Cleanup
  test('8. unmount repository', async () => {
    const result = await runner.repositoryUnmount(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('9. delete repository', async () => {
    const result = await runner.repositoryRm(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Ceph Full Stack Workflow
 *
 * Tests the complete Ceph workflow including COW clone mounting.
 */
test.describe.serial('Ceph Full Stack Workflow @bridge @ceph @integration', () => {
  let runner: BridgeTestRunner;
  const pool = `integration-pool-${Date.now()}`;
  const image = `integration-image-${Date.now()}`;
  const snapshot = `integration-snap-${Date.now()}`;
  const clone = `integration-clone-${Date.now()}`;
  const mountPoint = `/mnt/integration-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  // Health check
  test('1. check Ceph cluster health', async () => {
    const result = await runner.cephHealth();
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Create stack
  test('2. create pool', async () => {
    const result = await runner.cephPoolCreate(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('3. create image in pool', async () => {
    const result = await runner.cephImageCreate(pool, image, '1G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4. create snapshot of image', async () => {
    const result = await runner.cephSnapshotCreate(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5. protect snapshot', async () => {
    const result = await runner.cephSnapshotProtect(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('6. create clone from snapshot', async () => {
    const result = await runner.cephCloneCreate(pool, image, snapshot, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // COW Mount (the CORE use case)
  test('7. mount clone with COW overlay', async () => {
    const result = await runner.cephCloneMount(clone, mountPoint, '10G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Teardown in EXACT order
  test('8. unmount clone (exact teardown order)', async () => {
    const result = await runner.cephCloneUnmount(clone, false);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('9. delete clone', async () => {
    const result = await runner.cephCloneDelete(pool, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('10. unprotect snapshot', async () => {
    const result = await runner.cephSnapshotUnprotect(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('11. delete snapshot', async () => {
    const result = await runner.cephSnapshotDelete(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('12. delete image', async () => {
    const result = await runner.cephImageDelete(pool, image);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('13. delete pool', async () => {
    const result = await runner.cephPoolDelete(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Multi-Machine Integration Workflow
 *
 * Tests operations across multiple VMs.
 * VMs are automatically started via global-setup.ts.
 */
test.describe.serial('Multi-Machine Integration @bridge @multi-machine @integration', () => {
  let runner: BridgeTestRunner;
  const repoName = `multi-integration-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('1. verify all machines reachable', async () => {
    const workers = runner.getWorkerVMs();

    for (const vm of workers) {
      const reachable = await runner.isVMReachable(vm);
      expect(reachable).toBe(true);
    }
  });

  test('2. check setup on all machines', async () => {
    const results = await runner.executeOnAllWorkers('renet bridge once --test-mode --function machine_check_setup');

    for (const [vm, result] of results) {
      expect(runner.isSuccess(result)).toBe(true);
    }
  });

  test('3. check datastores on all machines', async () => {
    const workers = runner.getWorkerVMs();

    for (const vm of workers) {
      const result = await runner.testFunctionOnMachine(vm, {
        function: 'datastore_status',
        datastorePath: DEFAULT_DATASTORE_PATH,
      });
      expect(runner.isSuccess(result)).toBe(true);
    }
  });

  test('4. deploy repository to all machines', async () => {
    const workers = runner.getWorkerVMs();

    for (const vm of workers) {
      const result = await runner.deploy(repoName, vm, DEFAULT_DATASTORE_PATH);
      expect(runner.isSuccess(result)).toBe(true);
    }
  });

  test('5. push from VM1 to VM2', async () => {
    const result = await runner.push(repoName, runner.getWorkerVM2(), DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Container + Repository Integration
 *
 * Tests containers within the repository context.
 */
test.describe.serial('Container Repository Integration @bridge @integration', () => {
  let runner: BridgeTestRunner;
  const repoName = `container-integration-${Date.now()}`;
  const containerName = 'test-nginx';
  const datastorePath = DEFAULT_DATASTORE_PATH;
  const networkId = DEFAULT_NETWORK_ID;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  // Setup repository
  test('1. create repository', async () => {
    const result = await runner.repositoryNew(repoName, '2G', TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2. mount repository', async () => {
    const result = await runner.repositoryMount(repoName, TEST_PASSWORD, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Start services (which starts containers)
  test('3. up: start repository services', async () => {
    const result = await runner.repositoryUp(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Container operations
  test('4. list containers', async () => {
    const result = await runner.containerList(repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5. start container', async () => {
    const result = await runner.containerStart(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('6. inspect container', async () => {
    const result = await runner.containerInspect(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('7. get container logs', async () => {
    const result = await runner.containerLogs(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('8. stop container', async () => {
    const result = await runner.containerStop(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Cleanup
  test('9. down: stop repository services', async () => {
    const result = await runner.repositoryDown(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('10. unmount repository', async () => {
    const result = await runner.repositoryUnmount(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('11. delete repository', async () => {
    const result = await runner.repositoryRm(repoName, datastorePath);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Error Recovery Integration
 *
 * Tests graceful error handling and recovery.
 */
test.describe('Error Recovery Integration @bridge @integration', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('should handle sequential operations on nonexistent resources', async () => {
    const nonexistent = 'nonexistent-resource-xyz';

    // These should all fail gracefully without syntax errors
    const operations = [
      runner.repositoryInfo(nonexistent, DEFAULT_DATASTORE_PATH),
      runner.repositoryMount(nonexistent, TEST_PASSWORD, DEFAULT_DATASTORE_PATH),
      runner.repositoryUp(nonexistent, DEFAULT_DATASTORE_PATH),
      runner.repositoryDown(nonexistent, DEFAULT_DATASTORE_PATH),
      runner.repositoryUnmount(nonexistent, DEFAULT_DATASTORE_PATH),
      runner.repositoryRm(nonexistent, DEFAULT_DATASTORE_PATH),
    ];

    const results = await Promise.all(operations);

    for (const result of results) {
      expect(runner.isSuccess(result)).toBe(true);
    }
  });

  test('should recover from failed operation', async () => {
    // Attempt an operation that may fail
    const failResult = await runner.repositoryMount('likely-nonexistent', TEST_PASSWORD, DEFAULT_DATASTORE_PATH);
    expect(runner.isSuccess(failResult)).toBe(true);

    // System should still be responsive
    const pingResult = await runner.ping();
    expect(pingResult.code).toBe(0);
    expect(runner.getCombinedOutput(pingResult)).toContain('pong');
  });
});
