#!/usr/bin/env node --experimental-specifier-resolution=node --loader ts-node/esm
import { Command } from "commander";
// import chalk from "chalk";
import { version } from "./lib/version";
// import { manifestCommand } from "./manifest/manifest.command";

const program = new Command('golem-cli');
program.version(version);


// program.option('-n, --no-colors', 'Disable colors', (v) => {
//   chalk.level = 0;
// });

// program.addCommand(manifestCommand);


program.parse();
