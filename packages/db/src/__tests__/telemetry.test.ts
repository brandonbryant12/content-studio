import { describe, expect, it } from 'vitest';
import { resolveTracesEndpoint, resolveTracesHeaders } from '../telemetry';

describe('resolveTracesEndpoint', () => {
  it('returns undefined when traces endpoint is not provided', () => {
    expect(resolveTracesEndpoint({ serviceName: 'test-service' })).toBe(
      undefined,
    );
  });

  it('normalizes traces endpoint when hostname has no path', () => {
    expect(
      resolveTracesEndpoint({
        serviceName: 'test-service',
        otlpTracesEndpoint: 'http://localhost:4318',
      }),
    ).toBe('http://localhost:4318/');
  });

  it('preserves explicit traces endpoint paths', () => {
    expect(
      resolveTracesEndpoint({
        serviceName: 'test-service',
        otlpTracesEndpoint: 'http://localhost:4318/v1/traces',
      }),
    ).toBe('http://localhost:4318/v1/traces');
  });
});

describe('resolveTracesHeaders', () => {
  it('returns undefined when headers are not provided', () => {
    expect(resolveTracesHeaders({ serviceName: 'test-service' })).toBe(
      undefined,
    );
  });

  it('parses valid OTLP headers and ignores malformed entries', () => {
    expect(
      resolveTracesHeaders({
        serviceName: 'test-service',
        otlpHeaders: 'DD-API-KEY=abc123, malformed,LANG=en-US,bad=',
      }),
    ).toEqual({
      'DD-API-KEY': 'abc123',
      LANG: 'en-US',
    });
  });
});
