/* eslint-disable no-restricted-properties -- vitest setup intentionally sets process.env for test workers */
import {
  getTestConnectionString,
  stopPostgresContainer,
} from './testcontainers/postgres';

export default async function setup() {
  if (process.env.TEST_POSTGRES_URL) {
    return async function teardown() {};
  }

  const connectionString = await getTestConnectionString();
  process.env.TEST_POSTGRES_URL = connectionString;

  return async function teardown() {
    await stopPostgresContainer();
  };
}
