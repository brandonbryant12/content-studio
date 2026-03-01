import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepoFile = async (relativePath: string): Promise<string> =>
  readFile(path.join(process.cwd(), relativePath), 'utf8');

describe('telemetry docs guardrails', () => {
  it('keeps AGENTS and CLAUDE telemetry lifecycle guidance aligned', async () => {
    const [agents, claude] = await Promise.all([
      readRepoFile('AGENTS.md'),
      readRepoFile('CLAUDE.md'),
    ]);

    const expectedLine =
      '- **Backend telemetry lifecycle is layer-managed**: pass `telemetryConfig` to `createServerRuntime(...)`. The `TelemetryLive` Effect layer manages `NodeTracerProvider` creation, global registration, and scoped shutdown via `runtime.dispose()`.';

    expect(agents).toContain(expectedLine);
    expect(claude).toContain(expectedLine);
    expect(agents).not.toContain('initTelemetry(...)');
    expect(agents).not.toContain('shutdownTelemetry()');
  });

  it('documents silent no-op behavior when OTLP endpoint is missing', async () => {
    const [observabilityDoc, telemetrySource] = await Promise.all([
      readRepoFile('docs/architecture/observability.md'),
      readRepoFile('packages/db/src/telemetry.ts'),
    ]);

    expect(observabilityDoc).toContain(
      'If no endpoint is configured, telemetry performs a silent no-op and skips trace export entirely (no `ConsoleSpanExporter` fallback).',
    );
    expect(telemetrySource).toContain('if (!tracesEndpoint) {');
    expect(telemetrySource).toContain('return Layer.empty;');
  });
});
