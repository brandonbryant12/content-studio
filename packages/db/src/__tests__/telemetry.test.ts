import * as OTelInstrumentation from '@opentelemetry/instrumentation';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Effect, ManagedRuntime } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MalformedOtlpHeadersError,
  TelemetryLive,
  resolveTracesEndpoint,
  resolveTracesHeaders,
} from '../telemetry';

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('TelemetryLive lifecycle', () => {
  it('unregisters instrumentations before provider shutdown on runtime dispose', async () => {
    const callOrder: string[] = [];
    const unregisterInstrumentations = vi.fn(() => {
      callOrder.push('unregister');
    });

    const registerSpy = vi
      .spyOn(OTelInstrumentation, 'registerInstrumentations')
      .mockImplementation(() => unregisterInstrumentations);
    const forceFlushSpy = vi
      .spyOn(NodeTracerProvider.prototype, 'forceFlush')
      .mockImplementation(async () => {
        callOrder.push('forceFlush');
      });
    const shutdownSpy = vi
      .spyOn(NodeTracerProvider.prototype, 'shutdown')
      .mockImplementation(async () => {
        callOrder.push('shutdown');
      });

    const runtime = ManagedRuntime.make(
      TelemetryLive({
        serviceName: 'test-service',
        enabled: true,
        otlpTracesEndpoint: 'http://localhost:4318/v1/traces',
      }),
    );

    await runtime.runPromise(Effect.void);
    await runtime.dispose();

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(unregisterInstrumentations).toHaveBeenCalledTimes(1);
    expect(forceFlushSpy).toHaveBeenCalledTimes(1);
    expect(shutdownSpy).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['unregister', 'forceFlush', 'shutdown']);
  });
});
