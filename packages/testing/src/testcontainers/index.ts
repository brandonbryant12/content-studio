/**
 * Testcontainers utilities for Content Studio tests.
 *
 * Provides PostgreSQL container management for integration tests
 * with automatic lifecycle handling.
 */
export {
  startPostgresContainer,
  stopPostgresContainer,
  getTestDb,
  getConnectionString,
  isContainerRunning,
  pushSchema,
} from './postgres';
