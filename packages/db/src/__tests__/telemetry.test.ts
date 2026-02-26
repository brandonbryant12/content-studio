import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MalformedOtlpHeadersError,
  initTelemetry,
  resolveTracesEndpoint,
  resolveTracesHeaders,
  shutdownTelemetry,
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
      expect(err).toBeInstanceOf(MalformedOtlpHeadersError);
      expect((err as MalformedOtlpHeadersError).malformedEntries).toEqual([
        'malformed',
        'bad=',
      ]);
      expect((err as MalformedOtlpHeadersError)._tag).toBe(
        'MalformedOtlpHeadersError',
      );
    }
  });
});

describe('initTelemetry', () => {
  afterEach(async () => {
    await shutdownTelemetry();
  });

  it('warns when enabled but no OTLP endpoint is set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    initTelemetry({ serviceName: 'test-service' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
    );

    warnSpy.mockRestore();
  });

  it('does not warn when explicitly disabled', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    initTelemetry({ serviceName: 'test-service', enabled: false });

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
