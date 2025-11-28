import { Resource } from '@opentelemetry/resources';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { Effect, Layer } from 'effect';

/**
 * Re-export Effect's built-in tracing functions.
 *
 * Effect has first-class span support:
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   yield* Effect.log("Starting");
 *   const result = yield* doWork();
 *   return result;
 * }).pipe(Effect.withSpan("my-operation"));
 *
 * // Add attributes to current span
 * yield* Effect.annotateCurrentSpan("user.id", userId);
 *
 * // Nested spans create parent-child relationships automatically
 * const parent = childEffect.pipe(
 *   Effect.withSpan("child"),
 *   Effect.withSpan("parent")
 * );
 * ```
 */
export const withSpan = Effect.withSpan;
export const annotateSpan = Effect.annotateCurrentSpan;
export const currentSpan = Effect.currentSpan;
export const linkSpans = Effect.linkSpans;

export interface TelemetryConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly enabled?: boolean;
}

let initialized = false;

/**
 * Initialize OpenTelemetry with console exporter (for development).
 * Call once at app startup. In production, swap ConsoleSpanExporter for OTLP.
 */
export const initTelemetry = (config: TelemetryConfig): void => {
  if (config.enabled === false || initialized) return;

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion ?? '0.0.0',
    }),
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  provider.register();
  initialized = true;
};

/**
 * Layer that initializes telemetry at app startup.
 */
export const TelemetryLive = (config: TelemetryConfig): Layer.Layer<never> =>
  Layer.effectDiscard(Effect.sync(() => initTelemetry(config)));

/**
 * No-op layer for testing.
 */
export const TelemetryDisabled: Layer.Layer<never> = Layer.empty;
