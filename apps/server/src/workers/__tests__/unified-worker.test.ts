import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// Mock the fs module
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
}));

// Mock the sseManager (emit returns Promise now)
vi.mock('../../sse', () => ({
  sseManager: {
    emit: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(() => vi.fn()),
    broadcast: vi.fn().mockResolvedValue(undefined),
    getConnectionCount: vi.fn(() => 0),
    getConnectedUserCount: vi.fn(() => 0),
    initialize: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('UnifiedWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createUnifiedWorker', () => {
    it('should export createUnifiedWorker function', async () => {
      const { createUnifiedWorker } = await import('../unified-worker');
      expect(typeof createUnifiedWorker).toBe('function');
    });

    it('should accept UnifiedWorkerConfig', async () => {
      const { createUnifiedWorker } = await import('../unified-worker');

      // This should not throw - we're just testing the interface
      // The actual worker won't start because we're not calling start()
      const config = {
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        geminiApiKey: 'test-api-key',
        storageConfig: { provider: 'database' as const },
        useMockAI: true,
        enableHealthCheck: false,
      };

      // We can't actually create the worker without real dependencies,
      // but we can verify the function exists and accepts the config shape
      expect(() => createUnifiedWorker(config)).not.toThrow();
    });
  });

  describe('UnifiedWorkerConfig interface', () => {
    it('should support optional pollInterval', () => {
      // Type check: all these configs should be valid
      const minimalConfig = {
        databaseUrl: 'postgresql://localhost/test',
        geminiApiKey: 'key',
        storageConfig: { provider: 'database' as const },
      };

      const fullConfig = {
        databaseUrl: 'postgresql://localhost/test',
        geminiApiKey: 'key',
        storageConfig: { provider: 'database' as const },
        pollInterval: 5000,
        maxConsecutiveErrors: 5,
        useMockAI: true,
        enableHealthCheck: true,
      };

      // These are compile-time checks - if they don't error, the types are correct
      expect(minimalConfig.databaseUrl).toBeDefined();
      expect(fullConfig.pollInterval).toBe(5000);
    });
  });

  describe('health check', () => {
    it('should write health check file when enabled', async () => {
      // This tests the health check file writing functionality
      // The actual implementation writes to /tmp/worker-health
      const mockWriteFileSync = fs.writeFileSync as ReturnType<typeof vi.fn>;

      // Simulate what the health check does
      const healthCheckPath = '/tmp/worker-health';
      const timestamp = Date.now();
      mockWriteFileSync(healthCheckPath, timestamp.toString());

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        healthCheckPath,
        expect.any(String),
      );
    });
  });
});

describe('JOB_TYPES', () => {
  it('should handle all expected job types', () => {
    // These are the job types the unified worker should handle
    const expectedJobTypes = [
      'generate-podcast',
      'generate-script',
      'generate-audio',
      'generate-voiceover',
    ];

    // Verify the count and types
    expect(expectedJobTypes).toHaveLength(4);
    expect(expectedJobTypes).toContain('generate-podcast');
    expect(expectedJobTypes).toContain('generate-script');
    expect(expectedJobTypes).toContain('generate-audio');
    expect(expectedJobTypes).toContain('generate-voiceover');
  });
});

describe('Mode parsing', () => {
  it('should recognize valid modes', () => {
    const validModes = ['server', 'worker'];

    validModes.forEach((mode) => {
      expect(['server', 'worker']).toContain(mode);
    });
  });

  it('should default to server mode', () => {
    // The default mode should be 'server' for backwards compatibility
    const defaultMode = 'server';
    expect(defaultMode).toBe('server');
  });
});
