import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from '../lib/command';
import { runScript } from '../lib/effect-script';
import { assembleMasterSpec } from './assemble-master-spec';
import { generateDataModelArtifact } from './generate-data-model';
import { generateDomainMapArtifact } from './generate-domain-map';
import { generateOpenApiArtifacts } from './generate-openapi';
import { generateUiSurfaceArtifact } from './generate-ui-surface';
import { ensureDir, generatedRoot, repoRoot, writeUtf8 } from './utils';

const gitValue = async (args: string[]): Promise<string> => {
  const result = await runCommand('git', args, {
    cwd: repoRoot,
    allowFailure: true,
  });
  if (result.status !== 0) {
    return 'unknown';
  }

  const value = result.stdout.trim();
  return value || 'unknown';
};

const createSnapshotMetadataMarkdown = (input: {
  generatedAt: string;
  commit: string;
  branch: string;
  openApiEndpoints: number;
  apiTags: number;
  domains: number;
  useCases: number;
  tables: number;
  enums: number;
  routes: number;
  features: number;
}): string => {
  const lines: string[] = [];
  lines.push('# Snapshot Metadata (Generated)');
  lines.push('');
  lines.push(`- Generated at: ${input.generatedAt}`);
  lines.push(`- Git branch: ${input.branch}`);
  lines.push(`- Git commit: ${input.commit}`);
  lines.push('');
  lines.push('## Inventory');
  lines.push('');
  lines.push(`- API endpoints: ${input.openApiEndpoints}`);
  lines.push(`- API tags: ${input.apiTags}`);
  lines.push(`- Domains: ${input.domains}`);
  lines.push(`- Use cases: ${input.useCases}`);
  lines.push(`- Database tables: ${input.tables}`);
  lines.push(`- Database enums: ${input.enums}`);
  lines.push(`- UI routes: ${input.routes}`);
  lines.push(`- UI feature modules: ${input.features}`);
  lines.push('');
  lines.push('## Generated Files');
  lines.push('');
  lines.push(`- \`${path.relative(repoRoot, path.join(generatedRoot, 'openapi.json')).replaceAll(path.sep, '/')}\``);
  lines.push(`- \`${path.relative(repoRoot, path.join(generatedRoot, 'api-surface.md')).replaceAll(path.sep, '/')}\``);
  lines.push(`- \`${path.relative(repoRoot, path.join(generatedRoot, 'domain-surface.md')).replaceAll(path.sep, '/')}\``);
  lines.push(`- \`${path.relative(repoRoot, path.join(generatedRoot, 'data-model.md')).replaceAll(path.sep, '/')}\``);
  lines.push(`- \`${path.relative(repoRoot, path.join(generatedRoot, 'ui-surface.md')).replaceAll(path.sep, '/')}\``);
  return lines.join('\n');
};

export const main = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage:\n  pnpm software-factory spec generate');
    return;
  }

  await ensureDir(generatedRoot);

  const openapi = await generateOpenApiArtifacts();
  const domain = await generateDomainMapArtifact();
  const dataModel = await generateDataModelArtifact();
  const ui = await generateUiSurfaceArtifact();

  const generatedAt = new Date().toISOString();
  const [branch, commit] = await Promise.all([
    gitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
    gitValue(['rev-parse', '--short', 'HEAD']),
  ]);

  await writeUtf8(
    path.join(generatedRoot, 'snapshot-metadata.md'),
    createSnapshotMetadataMarkdown({
      generatedAt,
      branch,
      commit,
      openApiEndpoints: openapi.endpointCount,
      apiTags: openapi.tagCount,
      domains: domain.domainCount,
      useCases: domain.useCaseCount,
      tables: dataModel.tableCount,
      enums: dataModel.enumCount,
      routes: ui.routeCount,
      features: ui.featureModuleCount,
    }),
  );

  await assembleMasterSpec();
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runScript(main);
}
