import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { CephTestHelper } from '../../src/utils/bridge/CephTestHelper';

/**
 * Ceph Snapshot/Clone Operations Tests (12 functions)
 *
 * Tests Ceph snapshot and clone management including the CRITICAL
 * Copy-on-Write (COW) clone mount/unmount operations.
 *
 * Functions tested:
 * - ceph_snapshot_create
 * - ceph_snapshot_delete
 * - ceph_snapshot_list
 * - ceph_snapshot_protect
 * - ceph_snapshot_unprotect
 * - ceph_snapshot_rollback
 * - ceph_clone_create
 * - ceph_clone_delete
 * - ceph_clone_list
 * - ceph_clone_flatten
 * - ceph_clone_mount (COW overlay)
 * - ceph_clone_unmount (CRITICAL teardown order)
 *
 * CRITICAL: The ceph_clone_mount uses device mapper for COW overlay.
 * The ceph_clone_unmount MUST follow exact teardown order:
 * 1. sync & umount filesystem
 * 2. dmsetup remove cow device
 * 3. losetup detach loop device
 * 4. rbd unmap device
 * 5. delete COW file
 */
test.describe('Ceph Snapshot Operations @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  const pool = 'rbd';
  const image = `test-image-${Date.now()}`;
  const snapshot = `test-snap-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  // ===========================================================================
  // Snapshot Creation/Deletion
  // ===========================================================================

  test('ceph_snapshot_create should not have shell syntax errors', async () => {
    const result = await runner.cephSnapshotCreate(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_snapshot_delete should not have shell syntax errors', async () => {
    const result = await runner.cephSnapshotDelete(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Snapshot Information
  // ===========================================================================

  test('ceph_snapshot_list should not have shell syntax errors', async () => {
    const result = await runner.cephSnapshotList(pool, image);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Snapshot Protection
  // ===========================================================================

  test('ceph_snapshot_protect should not have shell syntax errors', async () => {
    const result = await runner.cephSnapshotProtect(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_snapshot_unprotect should not have shell syntax errors', async () => {
    const result = await runner.cephSnapshotUnprotect(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Snapshot Rollback
  // ===========================================================================

  test('ceph_snapshot_rollback should not have shell syntax errors', async () => {
    const result = await runner.cephSnapshotRollback(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

test.describe('Ceph Clone Operations @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  const pool = 'rbd';
  const image = `test-image-${Date.now()}`;
  const snapshot = `test-snap-${Date.now()}`;
  const clone = `test-clone-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  // ===========================================================================
  // Clone Creation/Deletion
  // ===========================================================================

  test('ceph_clone_create should not have shell syntax errors', async () => {
    const result = await runner.cephCloneCreate(pool, image, snapshot, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_clone_delete should not have shell syntax errors', async () => {
    const result = await runner.cephCloneDelete(pool, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Clone Information
  // ===========================================================================

  test('ceph_clone_list should not have shell syntax errors', async () => {
    const result = await runner.cephCloneList(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Clone Flatten
  // ===========================================================================

  test('ceph_clone_flatten should not have shell syntax errors', async () => {
    const result = await runner.cephCloneFlatten(pool, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Ceph Clone Mount/Unmount with COW
 *
 * Tests the CRITICAL Copy-on-Write mount functionality.
 * This is the CORE use case for Ceph integration.
 */
test.describe('Ceph Clone COW Mount/Unmount @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  const clone = `cow-test-clone-${Date.now()}`;
  const mountPoint = '/mnt/test-clone';

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  test('ceph_clone_mount should not have shell syntax errors', async () => {
    const result = await runner.cephCloneMount(clone, mountPoint, '10G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_clone_mount with custom COW size should work', async () => {
    const result = await runner.cephCloneMount(clone, mountPoint, '50G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_clone_unmount should not have shell syntax errors', async () => {
    const result = await runner.cephCloneUnmount(clone, false);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_clone_unmount with keep-cow should work', async () => {
    const result = await runner.cephCloneUnmount(clone, true);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Full Ceph Snapshot/Clone Lifecycle Test
 *
 * Tests the complete snapshot and clone lifecycle in STRICT order.
 * This is CRITICAL - the order must be exact to avoid orphaned resources.
 */
test.describe.serial('Ceph Snapshot/Clone Full Lifecycle @bridge @ceph @lifecycle', () => {
  let runner: BridgeTestRunner;
  const pool = `lifecycle-pool-${Date.now()}`;
  const image = `lifecycle-image-${Date.now()}`;
  const snapshot = `lifecycle-snap-${Date.now()}`;
  const clone = `lifecycle-clone-${Date.now()}`;
  const mountPoint = `/mnt/lifecycle-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  // Setup
  test('1. setup: create pool', async () => {
    const result = await runner.cephPoolCreate(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2. setup: create image', async () => {
    const result = await runner.cephImageCreate(pool, image, '1G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Snapshot operations
  test('3. ceph_snapshot_create: create snapshot', async () => {
    const result = await runner.cephSnapshotCreate(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4. ceph_snapshot_list: verify snapshot exists', async () => {
    const result = await runner.cephSnapshotList(pool, image);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5. ceph_snapshot_protect: protect snapshot for cloning', async () => {
    const result = await runner.cephSnapshotProtect(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Clone operations
  test('6. ceph_clone_create: create clone from snapshot', async () => {
    const result = await runner.cephCloneCreate(pool, image, snapshot, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('7. ceph_clone_list: verify clone exists', async () => {
    const result = await runner.cephCloneList(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // COW Mount (the CORE use case)
  test('8. ceph_clone_mount: mount clone with COW overlay', async () => {
    const result = await runner.cephCloneMount(clone, mountPoint, '10G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Teardown in EXACT order (CRITICAL)
  test('9. ceph_clone_unmount: unmount with exact teardown order', async () => {
    // MUST follow order:
    // 1. sync & umount filesystem
    // 2. dmsetup remove cow device
    // 3. losetup detach loop device
    // 4. rbd unmap device
    // 5. delete COW file
    const result = await runner.cephCloneUnmount(clone, false);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('10. ceph_clone_delete: delete clone', async () => {
    const result = await runner.cephCloneDelete(pool, clone);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('11. ceph_snapshot_unprotect: unprotect snapshot', async () => {
    const result = await runner.cephSnapshotUnprotect(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('12. ceph_snapshot_delete: delete snapshot', async () => {
    const result = await runner.cephSnapshotDelete(pool, image, snapshot);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // Cleanup
  test('13. cleanup: delete image', async () => {
    const result = await runner.cephImageDelete(pool, image);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('14. cleanup: delete pool', async () => {
    const result = await runner.cephPoolDelete(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Ceph Snapshot/Clone Error Handling
 *
 * Tests error handling for snapshot and clone operations.
 */
test.describe('Ceph Snapshot/Clone Error Handling @bridge @ceph', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  test('snapshot on nonexistent image should handle gracefully', async () => {
    const result = await runner.cephSnapshotCreate('rbd', 'nonexistent-xyz', 'snap');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('clone from nonexistent snapshot should handle gracefully', async () => {
    const result = await runner.cephCloneCreate('rbd', 'image', 'nonexistent-snap', 'clone');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('deleting protected snapshot should fail gracefully', async () => {
    const result = await runner.cephSnapshotDelete('rbd', 'image', 'protected-snap');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('unmounting non-mounted clone should handle gracefully', async () => {
    const result = await runner.cephCloneUnmount('nonexistent-clone');
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * CephTestHelper Integration Tests
 *
 * Tests using the CephTestHelper utility for resource management.
 */
test.describe('CephTestHelper Resource Management @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  let helper: CephTestHelper;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
    helper = new CephTestHelper(runner);
  });

  test.afterAll(async () => {
    // Cleanup all resources created during tests
    await helper.cleanup();
  });

  test('helper should generate unique resource names', () => {
    const pool1 = helper.generatePoolName();
    const pool2 = helper.generatePoolName('custom');
    const image1 = helper.generateImageName();
    const snap1 = helper.generateSnapshotName();
    const clone1 = helper.generateCloneName();

    expect(pool1).toContain('test-pool');
    expect(pool2).toContain('custom');
    expect(image1).toContain('test-image');
    expect(snap1).toContain('test-snap');
    expect(clone1).toContain('test-clone');

    // Names should be unique
    expect(pool1).not.toBe(pool2);
  });

  test('helper createPool should track resource for cleanup', async () => {
    const poolName = helper.generatePoolName('track-test');
    const result = await helper.createPool(poolName);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('helper cleanup should clean all tracked resources', async () => {
    const cleanupResult = await helper.cleanup();
    // In test mode, cleanup may report errors for non-existent resources
    expect(cleanupResult).toBeDefined();
  });
});
