import { describe, expect, it } from 'vitest';
import { ActivityLogNotFound } from '../../errors';

describe('activity errors', () => {
  it('ActivityLogNotFound exposes activityLogId in getData', () => {
    const error = new ActivityLogNotFound({ id: 'act_123' });
    expect(ActivityLogNotFound.getData(error)).toEqual({
      activityLogId: 'act_123',
    });
  });
});
