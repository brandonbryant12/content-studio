import { Resource } from '@opentelemetry/resources';
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { Effect, Layer } from 'effect';

export interface TelemetryConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly enabled?: boolean;
}

let initialized = false;

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

export const TelemetryLive = (config: TelemetryConfig): Layer.Layer<never> =>
  Layer.effectDiscard(Effect.sync(() => initTelemetry(config)));

export const TelemetryDisabled: Layer.Layer<never> = Layer.empty;
