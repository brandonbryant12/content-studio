import { describe, expect, it } from 'vitest';
import {
  MalformedOtlpHeadersError,
  resolveTracesEndpoint,
  resolveTracesHeaders,
} from '../telemetry';

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

  it('parses valid OTLP headers', () => {
    expect(
      resolveTracesHeaders({
        serviceName: 'test-service',
        otlpHeaders: 'DD-API-KEY=abc123,LANG=en-US',
      }),
    ).toEqual({
      'DD-API-KEY': 'abc123',
      LANG: 'en-US',
    });
  });

  it('throws MalformedOtlpHeadersError for malformed entries', () => {
    expect(() =>
      resolveTracesHeaders({
        serviceName: 'test-service',
        otlpHeaders: 'DD-API-KEY=abc123, malformed,LANG=en-US,bad=',
      }),
    ).toThrow(MalformedOtlpHeadersError);
  });

  it('includes malformedEntries in the thrown error', () => {
    try {
      resolveTracesHeaders({
        serviceName: 'test-service',
        otlpHeaders: 'DD-API-KEY=abc123, malformed,bad=',
      });
      expect.fail('Expected MalformedOtlpHeadersError to be thrown');
    } catch (err) {
      expect(err).toHaveProperty('_tag', 'MalformedOtlpHeadersError');
      expect(err).toHaveProperty('malformedEntries', ['malformed', 'bad=']);
    }
  });
});
