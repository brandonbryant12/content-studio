import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  type SpanExporter,
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
  readonly environment?: string;
  readonly enabled?: boolean;
  readonly otlpTracesEndpoint?: string;
  readonly otlpHeaders?: string;
}

let initialized = false;
let provider: NodeTracerProvider | null = null;

const DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';

const normalizeOtlpTracesEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/v1/traces') ? trimmed : `${trimmed}/v1/traces`;
};

const parseOtlpHeaders = (
  rawHeaders?: string,
): Record<string, string> | undefined => {
  if (!rawHeaders) {
    return undefined;
  }

  const entries = rawHeaders
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
        return null;
      }
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!key || !value) {
        return null;
      }
      return [key, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

const createSpanExporter = (config: TelemetryConfig): SpanExporter => {
  if (config.otlpTracesEndpoint) {
    return new OTLPTraceExporter({
      url: normalizeOtlpTracesEndpoint(config.otlpTracesEndpoint),
      headers: parseOtlpHeaders(config.otlpHeaders),
    });
  }

  return new ConsoleSpanExporter();
};

export const initTelemetry = (config: TelemetryConfig): void => {
  if (config.enabled === false || initialized) return;

  provider = new NodeTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion ?? '0.0.0',
      [DEPLOYMENT_ENVIRONMENT_NAME]: config.environment ?? 'development',
    }),
  });

  const exporter = createSpanExporter(config);
  if (config.otlpTracesEndpoint) {
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  } else {
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  }
  provider.register();
  initialized = true;
};

export const shutdownTelemetry = async (): Promise<void> => {
  if (!provider) return;
  await provider.shutdown();
  provider = null;
  initialized = false;
};

export const TelemetryLive = (config: TelemetryConfig): Layer.Layer<never> =>
  Layer.effectDiscard(Effect.sync(() => initTelemetry(config)));

export const TelemetryDisabled: Layer.Layer<never> = Layer.empty;
