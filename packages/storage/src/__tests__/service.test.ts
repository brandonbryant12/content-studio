import { describe, it, expect } from '@jest/globals';
import { Storage } from '../service';

describe('Storage service', () => {
  describe('Storage tag', () => {
    it('should have the correct tag identifier', () => {
      expect(Storage.key).toBe('@repo/storage/Storage');
    });
  });
});
