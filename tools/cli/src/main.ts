import { configureProxy } from './lib/proxy';
configureProxy();

import { Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { admin } from './commands/admin';
import { test } from './commands/test';
import { seed } from './commands/seed';

const cli = Command.make('cli', {}).pipe(
  Command.withDescription('Content Studio developer CLI'),
  Command.withSubcommands([admin, test, seed]),
);

const app = Command.run(cli, {
  name: 'Content Studio CLI',
  version: '0.0.1',
});

// eslint-disable-next-line no-restricted-properties
const args = process.argv;

app(args).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
