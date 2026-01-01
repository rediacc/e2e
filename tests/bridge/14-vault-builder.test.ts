import { test, expect } from '@playwright/test';
import { BridgeTestRunner } from '../../src/utils/bridge/BridgeTestRunner';
import { VaultBuilder } from '../../src/utils/vault/VaultBuilder';
import { DEFAULT_DATASTORE_PATH } from '../../src/constants';

/**
 * VaultBuilder Integration Tests
 *
 * Tests the VaultBuilder utility for constructing vault JSON for E2E testing.
 * These tests verify:
 * - VaultBuilder produces valid vault JSON structure
 * - Vaults can be loaded via renet --vault-file flag
 * - All backup_push/pull parameters are testable
 *
 * VMs are automatically started via global-setup.ts.
 */
test.describe('VaultBuilder Structure @bridge @vault', () => {
  test('should create valid vault JSON with minimal config', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withTeam('Test Team')
      .withMachine('192.168.111.11', 'muhammed', '/mnt/rediacc')
      .build();

    expect(vault.$schema).toBe('queue-vault-v2');
    expect(vault.version).toBe('2.0');
    expect(vault.task.function).toBe('backup_push');
    expect(vault.task.team).toBe('Test Team');
    expect(vault.machine.ip).toBe('192.168.111.11');
    expect(vault.machine.user).toBe('muhammed');
    expect(vault.machine.datastore).toBe('/mnt/rediacc');
  });

  test('should create vault with repository config', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withTeam('Test Team')
      .withRepository('repo-guid-123', 'test-repo', 2816)
      .build();

    expect(vault.task.repository).toBe('test-repo');
    expect(vault.repositories).toBeDefined();
    expect(vault.repositories!['test-repo']).toEqual({
      guid: 'repo-guid-123',
      name: 'test-repo',
      network_id: 2816,
    });
    expect(vault.params?.repository).toBe('repo-guid-123');
    expect(vault.params?.repositoryName).toBe('test-repo');
  });

  test('should create vault with push params', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withPushParams({
        destinationType: 'machine',
        to: 'dest-machine',
        tag: 'v1.0.0',
        state: 'online',
        checkpoint: true,
        override: false,
      })
      .build();

    expect(vault.params?.destinationType).toBe('machine');
    expect(vault.params?.to).toBe('dest-machine');
    expect(vault.params?.tag).toBe('v1.0.0');
    expect(vault.params?.state).toBe('online');
    expect(vault.params?.checkpoint).toBe(true);
    expect(vault.params?.override).toBe(false);
  });

  test('should create vault with pull params', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_pull')
      .withPullParams({
        sourceType: 'storage',
        from: 'rustfs-storage',
        grand: 'grand-repo-guid',
      })
      .build();

    expect(vault.params?.sourceType).toBe('storage');
    expect(vault.params?.from).toBe('rustfs-storage');
    expect(vault.params?.grand).toBe('grand-repo-guid');
  });

  test('should create vault with storage systems', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withStorage({
        name: 'rustfs',
        type: 's3',
        endpoint: 'http://192.168.111.1:9000',
        bucket: 'test-bucket',
        accessKey: 'rustfsadmin',
        secretKey: 'rustfsadmin',
        region: 'us-east-1',
      })
      .build();

    expect(vault.storage_systems).toBeDefined();
    expect(vault.storage_systems!['rustfs']).toEqual({
      backend: 's3',
      bucket: 'test-bucket',
      region: 'us-east-1',
      folder: undefined,
      parameters: {
        endpoint: 'http://192.168.111.1:9000',
        access_key_id: 'rustfsadmin',
        secret_access_key: 'rustfsadmin',
      },
    });
  });

  test('should create vault with multiple storages', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withStorages([
        { name: 's3-storage', type: 's3', bucket: 'bucket1', accessKey: 'key1', secretKey: 'secret1' },
        { name: 'b2-storage', type: 'b2', bucket: 'bucket2', accessKey: 'key2', secretKey: 'secret2' },
      ])
      .withPushParams({ storages: ['s3-storage', 'b2-storage'] })
      .build();

    expect(vault.storage_systems).toBeDefined();
    expect(Object.keys(vault.storage_systems!)).toHaveLength(2);
    expect(vault.params?.storages).toBe('s3-storage,b2-storage');
  });

  test('should create vault with destination machine', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withMachine('192.168.111.11', 'muhammed', '/mnt/rediacc')
      .withDestinationMachine('192.168.111.12', 'muhammed', '/mnt/rediacc')
      .build();

    expect(vault.extra_machines).toBeDefined();
    expect(vault.extra_machines!.destination).toEqual({
      ip: '192.168.111.12',
      user: 'muhammed',
      port: 22,
      datastore: '/mnt/rediacc',
    });
    expect(vault.params?.dest_machine).toBe('192.168.111.12');
  });

  test('should create vault with source machine', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_pull')
      .withMachine('192.168.111.11', 'muhammed', '/mnt/rediacc')
      .withSourceMachine('192.168.111.12', 'muhammed')
      .build();

    expect(vault.extra_machines).toBeDefined();
    expect(vault.extra_machines!.source).toEqual({
      ip: '192.168.111.12',
      user: 'muhammed',
      port: 22,
    });
    expect(vault.params?.source_machine).toBe('192.168.111.12');
  });

  test('should serialize to JSON', () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withTeam('Test Team');

    const json = vault.toJSON();
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.$schema).toBe('queue-vault-v2');
  });

  test('static forPush creates backup_push vault', () => {
    const vault = VaultBuilder.forPush().build();
    expect(vault.task.function).toBe('backup_push');
  });

  test('static forPull creates backup_pull vault', () => {
    const vault = VaultBuilder.forPull().build();
    expect(vault.task.function).toBe('backup_pull');
  });
});

test.describe('VaultBuilder with Renet @bridge @vault', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('push with vault should generate valid command', async () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withTeam('Test Team')
      .withRepository('test-repo-guid', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withPushParams({
        destinationType: 'machine',
        to: '192.168.111.12',
        tag: 'v1.0.0',
      });

    const result = await runner.pushWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });

  test('pull with vault should generate valid command', async () => {
    const vault = new VaultBuilder()
      .withFunction('backup_pull')
      .withTeam('Test Team')
      .withRepository('test-repo-guid', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withPullParams({
        sourceType: 'machine',
        from: '192.168.111.12',
      });

    const result = await runner.pullWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });

  test('push with checkpoint flag should work', async () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withTeam('Test Team')
      .withRepository('test-repo-guid', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withPushParams({
        destinationType: 'machine',
        checkpoint: true,
      });

    const result = await runner.pushWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
    // Checkpoint flag should be processed without errors
  });

  test('push with storage destination should work', async () => {
    const vault = new VaultBuilder()
      .withFunction('backup_push')
      .withTeam('Test Team')
      .withRepository('test-repo-guid', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withStorage({
        name: 'rustfs',
        type: 's3',
        endpoint: 'http://192.168.111.1:9000',
        bucket: 'test-bucket',
        accessKey: 'rustfsadmin',
        secretKey: 'rustfsadmin',
      })
      .withPushParams({
        destinationType: 'storage',
        dest: 'backup.tar',
        storages: ['rustfs'],
      });

    const result = await runner.pushWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });

  test('pull with grand param should work', async () => {
    const vault = new VaultBuilder()
      .withFunction('backup_pull')
      .withTeam('Test Team')
      .withRepository('test-repo-guid', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withPullParams({
        sourceType: 'machine',
        from: '192.168.111.12',
        grand: 'grand-repo-guid',
      });

    const result = await runner.pullWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });
});

test.describe('VaultBuilder Push Destination Types @bridge @vault', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('push with destinationType=machine should work', async () => {
    const vault = VaultBuilder.forPush()
      .withTeam('Test Team')
      .withRepository('test-repo', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withDestinationMachine('192.168.111.12', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withPushParams({
        destinationType: 'machine',
        machines: ['192.168.111.12'],
      });

    const result = await runner.pushWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });

  test('push with destinationType=storage should work', async () => {
    const vault = VaultBuilder.forPush()
      .withTeam('Test Team')
      .withRepository('test-repo', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withStorage({
        name: 'test-storage',
        type: 's3',
        bucket: 'test-bucket',
        accessKey: 'key',
        secretKey: 'secret',
      })
      .withPushParams({
        destinationType: 'storage',
        storages: ['test-storage'],
      });

    const result = await runner.pushWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });
});

test.describe('VaultBuilder Pull Source Types @bridge @vault', () => {
  let runner: BridgeTestRunner;

  test.beforeAll(async () => {
    runner = BridgeTestRunner.forWorker();
  });

  test('pull with sourceType=machine should work', async () => {
    const vault = VaultBuilder.forPull()
      .withTeam('Test Team')
      .withRepository('test-repo', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withSourceMachine('192.168.111.12', 'muhammed')
      .withPullParams({
        sourceType: 'machine',
        from: '192.168.111.12',
      });

    const result = await runner.pullWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });

  test('pull with sourceType=storage should work', async () => {
    const vault = VaultBuilder.forPull()
      .withTeam('Test Team')
      .withRepository('test-repo', 'test-repo')
      .withMachine('192.168.111.11', 'muhammed', DEFAULT_DATASTORE_PATH)
      .withStorage({
        name: 'test-storage',
        type: 's3',
        bucket: 'test-bucket',
        accessKey: 'key',
        secretKey: 'secret',
      })
      .withPullParams({
        sourceType: 'storage',
        from: 'test-storage',
      });

    const result = await runner.pullWithVault(vault);
    expect(runner.hasValidCommandSyntax(result)).toBe(true);
  });
});
