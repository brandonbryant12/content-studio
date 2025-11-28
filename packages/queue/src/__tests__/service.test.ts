import { describe, it, expect } from '@jest/globals';
import { Queue } from '../service';

describe('Queue service', () => {
  describe('Queue tag', () => {
    it('should have the correct tag identifier', () => {
      expect(Queue.key).toBe('@repo/queue/Queue');
    });
  });
});
