import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { Effect, Layer } from 'effect';

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

let initialized = false;
let provider: NodeTracerProvider | null = null;

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
  if (!url.pathname || url.pathname === '') {
    url.pathname = '/';
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

export const initTelemetry = (config: TelemetryConfig): void => {
  if (config.enabled === false || initialized) return;

  const tracesEndpoint = resolveTracesEndpoint(config);
  if (!tracesEndpoint) {
    // eslint-disable-next-line no-console
    console.warn(
      'Telemetry enabled but no OTEL_EXPORTER_OTLP_TRACES_ENDPOINT set — skipping trace export',
    );
    initialized = true;
    return;
  }

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion ?? '0.0.0',
      [DEPLOYMENT_ENVIRONMENT_NAME]: config.environment ?? 'development',
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: tracesEndpoint,
          headers: resolveTracesHeaders(config),
        }),
      ),
    ],
  });

  provider.register();
  initialized = true;
};

export const shutdownTelemetry = async (): Promise<void> => {
  if (provider) {
    await provider.shutdown();
    provider = null;
  }
  initialized = false;
};

export const TelemetryLive = (config: TelemetryConfig): Layer.Layer<never> =>
  Layer.effectDiscard(Effect.sync(() => initTelemetry(config)));

export const TelemetryDisabled: Layer.Layer<never> = Layer.empty;
