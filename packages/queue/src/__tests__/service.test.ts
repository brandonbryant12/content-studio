import { describe, it, expect } from 'vitest';
import { Queue } from '../service';

describe('Queue service', () => {
  describe('Queue tag', () => {
    it('should have the correct tag identifier', () => {
      expect(Queue.key).toBe('@repo/queue/Queue');
    });
  });
});
