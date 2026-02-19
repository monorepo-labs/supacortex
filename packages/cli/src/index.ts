#!/usr/bin/env node
import { Command } from "commander";
import { registerLoginCommand } from "./commands/login";
import { registerTokenCommand } from "./commands/token";
import { registerEndpointCommand } from "./commands/endpoint";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerBookmarksCommand } from "./commands/bookmarks";
import { registerGroupsCommand } from "./commands/groups";

const program = new Command();

program
  .name("scx")
  .description("Supacortex CLI — your second brain from the terminal")
  .version("0.1.0");

registerLoginCommand(program);
registerTokenCommand(program);
registerEndpointCommand(program);
registerWhoamiCommand(program);
registerBookmarksCommand(program);
registerGroupsCommand(program);

program.parse();
