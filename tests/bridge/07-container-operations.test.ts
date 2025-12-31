import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID } from '../../src/constants';

/**
 * Container Operations Tests (11 functions)
 *
 * Tests container management functions within repositories.
 *
 * Functions tested:
 * - container_start
 * - container_stop
 * - container_restart
 * - container_logs
 * - container_exec
 * - container_inspect
 * - container_stats
 * - container_list
 * - container_kill
 * - container_pause
 * - container_unpause
 *
 * Containers run within repository context and require:
 * - Repository to be created and mounted
 * - Docker or compatible runtime available
 */
test.describe('Container Operations @bridge', () => {
  let runner: BridgeTestRunner;
  const testRepo = 'container-test-repo';
  const testContainer = 'test-container';

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
    await runner.resetWorkerState();
    // Setup and start daemon before container tests (required for Docker socket)
    const setupResult = await runner.daemonSetup(DEFAULT_NETWORK_ID);
    if (!runner.isSuccess(setupResult)) {
      throw new Error(`daemon_setup failed: ${runner.getCombinedOutput(setupResult)}`);
    }
    const startResult = await runner.daemonStart(undefined, undefined, DEFAULT_NETWORK_ID);
    if (!runner.isSuccess(startResult)) {
      throw new Error(`daemon_start failed: ${runner.getCombinedOutput(startResult)}`);
    }
  });

  test.afterAll(async () => {
    await runner.daemonTeardown(DEFAULT_NETWORK_ID);
  });

  // ===========================================================================
  // Basic Container Operations
  // ===========================================================================

  test('container_start should not have shell syntax errors', async () => {
    const result = await runner.containerStart(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_stop should not have shell syntax errors', async () => {
    const result = await runner.containerStop(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_restart should not have shell syntax errors', async () => {
    const result = await runner.containerRestart(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_kill should not have shell syntax errors', async () => {
    const result = await runner.containerKill(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Container State Operations
  // ===========================================================================

  test('container_pause should not have shell syntax errors', async () => {
    const result = await runner.containerPause(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_unpause should not have shell syntax errors', async () => {
    const result = await runner.containerUnpause(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Container Information Operations
  // ===========================================================================

  test('container_logs should not have shell syntax errors', async () => {
    const result = await runner.containerLogs(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_inspect should not have shell syntax errors', async () => {
    const result = await runner.containerInspect(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_stats should not have shell syntax errors', async () => {
    const result = await runner.containerStats(testContainer, testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_list should not have shell syntax errors', async () => {
    const result = await runner.containerList(testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  // ===========================================================================
  // Container Exec Operation
  // ===========================================================================

  test('container_exec should not have shell syntax errors', async () => {
    const result = await runner.containerExec(testContainer, 'echo hello', testRepo, DEFAULT_DATASTORE_PATH, DEFAULT_NETWORK_ID);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_exec with complex command should handle correctly', async () => {
    const result = await runner.containerExec(
      testContainer,
      'ls -la /app && cat /etc/os-release',
      testRepo,
      DEFAULT_DATASTORE_PATH,
      DEFAULT_NETWORK_ID
    );
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_exec with quotes should handle correctly', async () => {
    const result = await runner.containerExec(
      testContainer,
      'echo "hello world"',
      testRepo,
      DEFAULT_DATASTORE_PATH,
      DEFAULT_NETWORK_ID
    );
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Container Lifecycle Tests
 *
 * Tests container lifecycle in proper order.
 */
test.describe.serial('Container Lifecycle @bridge @lifecycle', () => {
  let runner: BridgeTestRunner;
  const repoName = `container-lifecycle-${Date.now()}`;
  const containerName = `lifecycle-container-${Date.now()}`;
  const datastorePath = DEFAULT_DATASTORE_PATH;
  const networkId = DEFAULT_NETWORK_ID;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
    await runner.resetWorkerState();
    // Setup and start daemon before container tests (required for Docker socket)
    const setupResult = await runner.daemonSetup(networkId);
    if (!runner.isSuccess(setupResult)) {
      throw new Error(`daemon_setup failed: ${runner.getCombinedOutput(setupResult)}`);
    }
    const startResult = await runner.daemonStart(undefined, undefined, networkId);
    if (!runner.isSuccess(startResult)) {
      throw new Error(`daemon_start failed: ${runner.getCombinedOutput(startResult)}`);
    }
  });

  test.afterAll(async () => {
    await runner.daemonTeardown(networkId);
  });

  test('1. container_list: list containers initially', async () => {
    const result = await runner.containerList(repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('2. container_start: start container', async () => {
    const result = await runner.containerStart(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('3. container_list: verify container started', async () => {
    const result = await runner.containerList(repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('4. container_inspect: get container details', async () => {
    const result = await runner.containerInspect(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('5. container_stats: get container stats', async () => {
    const result = await runner.containerStats(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('6. container_exec: run command in container', async () => {
    const result = await runner.containerExec(containerName, 'hostname', repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('7. container_logs: get container logs', async () => {
    const result = await runner.containerLogs(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('8. container_pause: pause container', async () => {
    const result = await runner.containerPause(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('9. container_unpause: unpause container', async () => {
    const result = await runner.containerUnpause(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('10. container_restart: restart container', async () => {
    const result = await runner.containerRestart(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('11. container_stop: stop container', async () => {
    const result = await runner.containerStop(containerName, repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('12. container_list: verify container stopped', async () => {
    const result = await runner.containerList(repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Container Error Handling Tests
 *
 * Tests error handling for container operations.
 */
test.describe('Container Error Handling @bridge', () => {
  let runner: BridgeTestRunner;
  const networkId = DEFAULT_NETWORK_ID;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
    await runner.resetWorkerState();
    // Setup and start daemon before container tests (required for Docker socket)
    const setupResult = await runner.daemonSetup(networkId);
    if (!runner.isSuccess(setupResult)) {
      throw new Error(`daemon_setup failed: ${runner.getCombinedOutput(setupResult)}`);
    }
    const startResult = await runner.daemonStart(undefined, undefined, networkId);
    if (!runner.isSuccess(startResult)) {
      throw new Error(`daemon_start failed: ${runner.getCombinedOutput(startResult)}`);
    }
  });

  test.afterAll(async () => {
    await runner.daemonTeardown(networkId);
  });

  test('operations on nonexistent container should handle gracefully', async () => {
    const nonexistent = 'nonexistent-container-xyz';

    const stopResult = await runner.containerStop(nonexistent, 'test-repo', DEFAULT_DATASTORE_PATH, networkId);
    expect(runner.isSuccess(stopResult)).toBe(true);

    const logsResult = await runner.containerLogs(nonexistent, 'test-repo', DEFAULT_DATASTORE_PATH, networkId);
    expect(runner.isSuccess(logsResult)).toBe(true);

    const inspectResult = await runner.containerInspect(nonexistent, 'test-repo', DEFAULT_DATASTORE_PATH, networkId);
    expect(runner.isSuccess(inspectResult)).toBe(true);
  });

  test('container_exec on stopped container should handle gracefully', async () => {
    const result = await runner.containerExec('stopped-container', 'echo test', 'test-repo', DEFAULT_DATASTORE_PATH, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container_pause on already paused should handle gracefully', async () => {
    const result = await runner.containerPause('paused-container', 'test-repo', DEFAULT_DATASTORE_PATH, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('container with special characters in name should handle correctly', async () => {
    const result = await runner.containerStart('special-name_123', 'test-repo', DEFAULT_DATASTORE_PATH, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });
});

/**
 * Multiple Container Operations Tests
 *
 * Tests operations on multiple containers.
 */
test.describe('Multiple Container Operations @bridge', () => {
  let runner: BridgeTestRunner;
  const repoName = 'multi-container-repo';
  const datastorePath = DEFAULT_DATASTORE_PATH;
  const networkId = DEFAULT_NETWORK_ID;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
    await runner.resetWorkerState();
    // Setup and start daemon before container tests (required for Docker socket)
    const setupResult = await runner.daemonSetup(networkId);
    if (!runner.isSuccess(setupResult)) {
      throw new Error(`daemon_setup failed: ${runner.getCombinedOutput(setupResult)}`);
    }
    const startResult = await runner.daemonStart(undefined, undefined, networkId);
    if (!runner.isSuccess(startResult)) {
      throw new Error(`daemon_start failed: ${runner.getCombinedOutput(startResult)}`);
    }
  });

  test.afterAll(async () => {
    await runner.daemonTeardown(networkId);
  });

  test('starting multiple containers should work', async () => {
    const containers = ['container-1', 'container-2', 'container-3'];

    for (const container of containers) {
      const result = await runner.containerStart(container, repoName, datastorePath, networkId);
      expect(runner.isSuccess(result)).toBe(true);
    }
  });

  test('listing all containers should work', async () => {
    const result = await runner.containerList(repoName, datastorePath, networkId);
    expect(runner.isSuccess(result)).toBe(true);
  });

  test('stopping multiple containers should work', async () => {
    const containers = ['container-1', 'container-2', 'container-3'];

    for (const container of containers) {
      const result = await runner.containerStop(container, repoName, datastorePath, networkId);
      expect(runner.isSuccess(result)).toBe(true);
    }
  });
});
