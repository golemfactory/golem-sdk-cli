#!/usr/bin/env node
import { Command } from "commander";
import { version } from "./lib/version";
import { manifestCommand } from "./manifest/manifest.command";
import { newCommand } from "./new/new.command";
import { runOnGolemCommand } from "./run-on-golem/run-on-golem.command";

const program = new Command("golem-sdk");
program.version(version);

// program.option('-n, --no-colors', 'Disable colors', (v) => {
//   chalk.level = 0;
// });

program.addCommand(manifestCommand).addCommand(newCommand).addCommand(runOnGolemCommand);

program.parse();
