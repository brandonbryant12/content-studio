import { describe, expect, it } from 'vitest';
import {
  evaluateChunkGuardrails,
  type JsChunkInfo,
} from '../guardrails/check-web-build-artifacts';

const chunk = (name: string, sizeBytes: number): JsChunkInfo => ({ name, sizeBytes });

describe('check-web-build-artifacts', () => {
  it('passes when chunk count and largest chunk stay under thresholds', () => {
    const result = evaluateChunkGuardrails(
      [chunk('vendor.js', 300 * 1024), chunk('route.js', 24 * 1024)],
      { maxChunkCount: 10, maxLargestChunkKb: 450 },
    );

    expect(result).toEqual([]);
  });

  it('fails when chunk count exceeds threshold', () => {
    const result = evaluateChunkGuardrails(
      [chunk('a.js', 1), chunk('b.js', 1), chunk('c.js', 1)],
      { maxChunkCount: 2, maxLargestChunkKb: 450 },
    );

    expect(result[0]).toContain('chunk count');
  });

  it('fails when largest chunk exceeds threshold', () => {
    const result = evaluateChunkGuardrails(
      [chunk('vendor.js', 500 * 1024)],
      { maxChunkCount: 10, maxLargestChunkKb: 450 },
    );

    expect(result[0]).toContain('Largest JS chunk');
  });

  it('fails clearly when no chunks are present', () => {
    const result = evaluateChunkGuardrails([], {
      maxChunkCount: 10,
      maxLargestChunkKb: 450,
    });

    expect(result[0]).toContain('No JS chunks found');
  });
});
