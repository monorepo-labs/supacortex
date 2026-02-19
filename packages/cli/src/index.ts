#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import { registerLoginCommand } from "./commands/login";
import { registerLogoutCommand } from "./commands/logout";
import { registerTokenCommand } from "./commands/token";
import { registerEndpointCommand } from "./commands/endpoint";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerBookmarksCommand } from "./commands/bookmarks";
import { registerGroupsCommand } from "./commands/groups";
import { registerSyncCommand } from "./commands/sync";
import { registerUpdateCommand } from "./commands/update";
import { checkForUpdates } from "./lib/update-notifier";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();

program
  .name("scx")
  .description("Supacortex CLI — your second brain from the terminal")
  .version(pkg.version);

registerLoginCommand(program);
registerLogoutCommand(program);
registerTokenCommand(program);
registerEndpointCommand(program);
registerWhoamiCommand(program);
registerBookmarksCommand(program);
registerGroupsCommand(program);
registerSyncCommand(program);
registerUpdateCommand(program, pkg.version);

checkForUpdates(pkg.version);
program.parse();
