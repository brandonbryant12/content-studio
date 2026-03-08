import { Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { admin } from './commands/admin';
import { ProductBranding } from './constants';
import { seed } from './commands/seed';
import { test } from './commands/test';
import { configureProxy } from './lib/proxy';

configureProxy();

const cli = Command.make('cli', {}).pipe(
  Command.withDescription(ProductBranding.DEVELOPER_CLI_DESCRIPTION),
  Command.withSubcommands([admin, test, seed]),
);

const app = Command.run(cli, {
  name: ProductBranding.CLI_NAME,
  version: '0.0.1',
});

const args = process.argv;

app(args).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
