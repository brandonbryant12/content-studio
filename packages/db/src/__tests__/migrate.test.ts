import { describe, it, expect } from 'vitest';
import { runMigrations } from '../migrate';

describe('runMigrations', () => {
  it('exports a function', () => {
    expect(typeof runMigrations).toBe('function');
  });

  it('accepts a database instance and optional migrations folder', () => {
    // Verify the function signature — 2 params (db, migrationsFolder?)
    expect(runMigrations.length).toBe(2); // db + optional migrationsFolder
  });
});
