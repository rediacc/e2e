/**
 * E2E Test Constants
 *
 * Centralized configuration values used across bridge tests.
 * These should match the system configuration in .env and organization vault.
 */

/**
 * Default datastore path used for machine setup and repository operations.
 * Matches REDIACC_DEV_MACHINES datastore path in .env
 */
export const DEFAULT_DATASTORE_PATH = '/mnt/rediacc';

/**
 * Universal user ID for rediacc system user.
 * Matches UNIVERSAL_USER_ID in organization vault and .env
 * VMs have builder:x:1000:1000 pre-existing, so we use 7111 instead.
 */
export const DEFAULT_UID = '7111';

/**
 * Default network ID for test environments.
 * Used by daemon operations that require network context.
 *
 * Network ID formula: 2816 + (n * 64)
 * - 9152 = 2816 + (99 * 64)  - Default/Parent
 * - 9216 = 2816 + (100 * 64) - Fork A
 * - 9280 = 2816 + (101 * 64) - Fork B
 */
export const DEFAULT_NETWORK_ID = '9152';

/**
 * Fork network IDs for repository isolation tests.
 * Each fork needs its own network ID to have isolated Docker daemon.
 * Docker socket path: /var/run/rediacc/docker-{networkId}.sock
 */
export const FORK_NETWORK_ID_A = '9216';
export const FORK_NETWORK_ID_B = '9280';

/**
 * Test-specific constants
 */
export const TEST_REPOSITORY_PREFIX = 'test-repo';
export const TEST_CONTAINER_PREFIX = 'test-container';

/**
 * Renet binary installation path.
 * NOTE: Mirrored from renet/pkg/common/constants.go (RenetBinaryPath)
 *
 * Uses /usr/bin because sudo's restricted PATH doesn't include /usr/local/bin.
 */
export const RENET_BINARY_PATH = '/usr/bin/renet';
