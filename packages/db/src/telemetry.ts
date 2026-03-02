import {
  Tracer as OtelEffectTracer,
  Resource as OtelResource,
} from '@effect/opentelemetry';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ORPCInstrumentation } from '@orpc/otel';
import { Effect, Layer } from 'effect';
import type { Context } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/sdk-trace-base';

export class MalformedOtlpHeadersError extends Error {
  readonly _tag = 'MalformedOtlpHeadersError';
  constructor(readonly malformedEntries: string[]) {
    super(`Malformed OTLP header entries: ${malformedEntries.join(', ')}`);
    this.name = 'MalformedOtlpHeadersError';
  }
}

export interface TelemetryConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly environment?: string;
  readonly enabled?: boolean;
  readonly otlpTracesEndpoint?: string;
  readonly otlpHeaders?: string;
}

/**
 * SpanProcessor that renames oRPC auto-generated spans to match our naming convention.
 * Transforms the `call_procedure` span using its `procedure.path` attribute:
 *   call_procedure [procedure.path=["documents","get"]] → api.documents.get
 */
class ORPCSpanRenamer implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span, _parentContext: Context): void {
    if (span.name === 'call_procedure') {
      const path = span.attributes['procedure.path'];
      if (Array.isArray(path)) {
        span.updateName(`api.${path.join('.')}`);
      }
    }
  }

  onEnd(_span: ReadableSpan): void {
    // No-op
  }
}

const DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';

const parseOtlpEndpointUrl = (endpoint: string): URL | null => {
  try {
    return new URL(endpoint);
  } catch {
    return null;
  }
};

const normalizeOtlpTracesEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim();
  const url = parseOtlpEndpointUrl(trimmed);
  if (!url) {
    return trimmed;
  }
  return url.toString();
};

const parseOtlpHeaders = (
  rawHeaders?: string,
): Record<string, string> | undefined => {
  if (!rawHeaders) {
    return undefined;
  }

  const malformed: string[] = [];
  const entries: [string, string][] = [];

  for (const raw of rawHeaders.split(',')) {
    const entry = raw.trim();
    if (entry.length === 0) continue;

    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
      malformed.push(entry);
      continue;
    }
    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      malformed.push(entry);
      continue;
    }
    entries.push([key, value]);
  }

  if (malformed.length > 0) {
    throw new MalformedOtlpHeadersError(malformed);
  }

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

export const resolveTracesEndpoint = (
  config: TelemetryConfig,
): string | undefined => {
  if (config.otlpTracesEndpoint) {
    return normalizeOtlpTracesEndpoint(config.otlpTracesEndpoint);
  }
  return undefined;
};

export const resolveTracesHeaders = (
  config: TelemetryConfig,
): Record<string, string> | undefined => {
  return parseOtlpHeaders(config.otlpHeaders);
};

/**
 * Unified telemetry layer that manages the full OpenTelemetry SDK lifecycle.
 *
 * Creates a `NodeTracerProvider` with:
 * - `ORPCSpanRenamer` for procedure span naming
 * - `BatchSpanProcessor` → `OTLPTraceExporter` for trace export
 * - Global provider registration for `@orpc/otel` auto-instrumentation
 * - Instrumentation unregister on dispose to avoid duplicate patching in
 *   multi-runtime scenarios (tests/scripts)
 * - Effect span bridge via `@effect/opentelemetry` (all `Effect.withSpan`
 *   calls produce real OTel spans)
 * - Scoped lifecycle: provider is flushed + shut down when the Effect
 *   runtime is disposed (no manual `shutdownTelemetry()` needed)
 *
 * When `enabled` is false or no OTLP endpoint is configured, returns
 * `Layer.empty` (no-op).
 */
export const TelemetryLive = (config: TelemetryConfig): Layer.Layer<never> => {
  if (config.enabled === false) return Layer.empty;

  const tracesEndpoint = resolveTracesEndpoint(config);
  if (!tracesEndpoint) {
    return Layer.empty;
  }

  const resourceLayer = OtelResource.layer({
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion ?? '0.0.0',
    attributes: {
      [DEPLOYMENT_ENVIRONMENT_NAME]: config.environment ?? 'development',
    },
  });

  const providerLayer = Layer.scoped(
    OtelEffectTracer.OtelTracerProvider,
    Effect.flatMap(OtelResource.Resource, (resource) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const nodeProvider = new NodeTracerProvider({
            resource,
            spanProcessors: [
              new ORPCSpanRenamer(),
              new BatchSpanProcessor(
                new OTLPTraceExporter({
                  url: tracesEndpoint,
                  headers: resolveTracesHeaders(config),
                }),
              ),
            ],
          });

          nodeProvider.register();

          const unregisterInstrumentations = registerInstrumentations({
            tracerProvider: nodeProvider,
            instrumentations: [new ORPCInstrumentation()],
          });

          return { nodeProvider, unregisterInstrumentations };
        }),
        ({ nodeProvider, unregisterInstrumentations }) =>
          Effect.promise(async () => {
            try {
              unregisterInstrumentations();
            } finally {
              await nodeProvider.forceFlush();
              await nodeProvider.shutdown();
            }
          }).pipe(Effect.ignoreLogged, Effect.interruptible),
      ).pipe(Effect.map(({ nodeProvider }) => nodeProvider)),
    ),
  );

  return OtelEffectTracer.layerWithoutOtelTracer.pipe(
    Layer.provide(OtelEffectTracer.layer),
    Layer.provide(providerLayer),
    Layer.provide(resourceLayer),
  );
};
