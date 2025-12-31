import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { CephTestHelper } from '../../src/utils/bridge/CephTestHelper';

/**
 * Ceph Pool/Image Operations Tests (12 functions)
 *
 * Tests Ceph pool and image management functions.
 * These are LEVEL 4 functions - require Ceph cluster available.
 *
 * Functions tested:
 * - ceph_health
 * - ceph_pool_create
 * - ceph_pool_delete
 * - ceph_pool_list
 * - ceph_pool_info
 * - ceph_pool_stats
 * - ceph_image_create
 * - ceph_image_delete
 * - ceph_image_list
 * - ceph_image_info
 * - ceph_image_resize
 * - ceph_image_map
 *
 * Tests validate command syntax and structure. With a Ceph cluster available,
 * commands will execute actual operations. Without Ceph, renet runs in
 * test-mode which validates syntax only.
 */
test.describe('Ceph Health Check @bridge @ceph', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  test('ceph_health should not have shell syntax errors', async () => {
    const result = await runner.cephHealth();
    expect(runner.isSuccess(result)).toBe(true);
  });
});

test.describe('Ceph Pool Operations @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  const testPool = `test-pool-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  // ===========================================================================
  // Pool Creation/Deletion
  // ===========================================================================

  test('ceph_pool_create should not have shell syntax errors', async () => {
    const result = await runner.cephPoolCreate(testPool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_pool_delete should not have shell syntax errors', async () => {
    const result = await runner.cephPoolDelete(testPool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Pool Information
  // ===========================================================================

  test('ceph_pool_list should not have shell syntax errors', async () => {
    const result = await runner.cephPoolList();
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_pool_info should not have shell syntax errors', async () => {
    const result = await runner.cephPoolInfo(testPool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_pool_stats should not have shell syntax errors', async () => {
    const result = await runner.cephPoolStats(testPool);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

test.describe('Ceph Image Operations @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  const testPool = 'rbd';
  const testImage = `test-image-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  // ===========================================================================
  // Image Creation/Deletion
  // ===========================================================================

  test('ceph_image_create should not have shell syntax errors', async () => {
    const result = await runner.cephImageCreate(testPool, testImage, '1G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_image_delete should not have shell syntax errors', async () => {
    const result = await runner.cephImageDelete(testPool, testImage);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Image Information
  // ===========================================================================

  test('ceph_image_list should not have shell syntax errors', async () => {
    const result = await runner.cephImageList(testPool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_image_info should not have shell syntax errors', async () => {
    const result = await runner.cephImageInfo(testPool, testImage);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Image Modification
  // ===========================================================================

  test('ceph_image_resize should not have shell syntax errors', async () => {
    const result = await runner.cephImageResize(testPool, testImage, '2G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_image_map should not have shell syntax errors', async () => {
    const result = await runner.cephImageMap(testPool, testImage);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Ceph Pool/Image Lifecycle Test
 *
 * Tests the complete pool and image lifecycle in order.
 */
test.describe.serial('Ceph Pool/Image Lifecycle @bridge @ceph @lifecycle', () => {
  let runner: BridgeTestRunner;
  const pool = `lifecycle-pool-${Date.now()}`;
  const image = `lifecycle-image-${Date.now()}`;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  test('1. ceph_health: check cluster health', async () => {
    const result = await runner.cephHealth();
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2. ceph_pool_create: create test pool', async () => {
    const result = await runner.cephPoolCreate(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('3. ceph_pool_list: verify pool exists', async () => {
    const result = await runner.cephPoolList();
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4. ceph_pool_info: get pool details', async () => {
    const result = await runner.cephPoolInfo(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5. ceph_pool_stats: get pool statistics', async () => {
    const result = await runner.cephPoolStats(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('6. ceph_image_create: create RBD image', async () => {
    const result = await runner.cephImageCreate(pool, image, '1G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('7. ceph_image_list: verify image exists', async () => {
    const result = await runner.cephImageList(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('8. ceph_image_info: get image details', async () => {
    const result = await runner.cephImageInfo(pool, image);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('9. ceph_image_resize: resize image to 2G', async () => {
    const result = await runner.cephImageResize(pool, image, '2G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('10. ceph_image_delete: delete image', async () => {
    const result = await runner.cephImageDelete(pool, image);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('11. ceph_pool_delete: delete pool', async () => {
    const result = await runner.cephPoolDelete(pool);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Ceph Error Handling Tests
 *
 * Tests error handling for Ceph operations.
 */
test.describe('Ceph Error Handling @bridge @ceph', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  test('operations on nonexistent pool should handle gracefully', async () => {
    const nonexistent = 'nonexistent-pool-xyz';

    const infoResult = await runner.cephPoolInfo(nonexistent);
    expect(runner.isSuccess(infoResult)).toBe(true);

    const deleteResult = await runner.cephPoolDelete(nonexistent);
    expect(runner.isSuccess(deleteResult)).toBe(true);
  });

  test('operations on nonexistent image should handle gracefully', async () => {
    const pool = 'rbd';
    const nonexistent = 'nonexistent-image-xyz';

    const infoResult = await runner.cephImageInfo(pool, nonexistent);
    expect(runner.isSuccess(infoResult)).toBe(true);

    const deleteResult = await runner.cephImageDelete(pool, nonexistent);
    expect(runner.isSuccess(deleteResult)).toBe(true);
  });

  test('creating pool with invalid name should handle gracefully', async () => {
    const result = await runner.cephPoolCreate('invalid pool name');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('resizing image to smaller size should handle appropriately', async () => {
    const result = await runner.cephImageResize('rbd', 'test-image', '1M');
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Ceph Size Parameter Tests
 *
 * Tests various size formats for Ceph operations.
 */
test.describe('Ceph Size Parameters @bridge @ceph', () => {
  let runner: BridgeTestRunner;
  const pool = 'rbd';

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forCeph();
  });

  test('ceph_image_create with MB size should work', async () => {
    const result = await runner.cephImageCreate(pool, 'mb-image', '500M');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_image_create with GB size should work', async () => {
    const result = await runner.cephImageCreate(pool, 'gb-image', '5G');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_image_create with TB size should work', async () => {
    const result = await runner.cephImageCreate(pool, 'tb-image', '1T');
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('ceph_image_resize to larger size should work', async () => {
    const result = await runner.cephImageResize(pool, 'test-image', '100G');
    expect(runner.isSuccess(result)).toBe(true);
  });
});
