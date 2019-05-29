#!/usr/bin/env node

import yargs = require('yargs');
import { DEFAULT_DYNOGEN_CONFIG_PATH } from './constants';

import { generateHandler } from './generate';
import { panic } from './util';

function cmd<T>(handler: (context: T) => Promise<void> | void) {
  return (context: T) => {
    try {
      return handler(context);
    } catch (err) {
      panic(err);
    }
  };
}

// tslint:disable-next-line no-unused-expression
yargs
  .scriptName('dynogen')
  .usage('dynogen <cmd> [args]')
  .recommendCommands()
  .command({
    command: 'generate',
    describe: 'Build DynamoDB mappers from config',
    builder: (yargs) =>
      yargs.option('config', {
        type: 'string',
        default: DEFAULT_DYNOGEN_CONFIG_PATH,
        description: 'path to dynogen config'
      }),
    handler: cmd(generateHandler)
  })
  .command({
    command: ['help'],
    handler: () => yargs.showHelp()
  })
  .demandCommand()
  .recommendCommands()
  .strict().argv;
