#!/usr/bin/env node
import { Command } from "commander";
import { registerTokenCommand } from "./commands/token";
import { registerEndpointCommand } from "./commands/endpoint";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerBookmarksCommand } from "./commands/bookmarks";
import { registerGroupsCommand } from "./commands/groups";

const program = new Command();

program.name("scx").description("Later").version("0.0.1");

registerTokenCommand(program);
registerEndpointCommand(program);
registerWhoamiCommand(program);
registerBookmarksCommand(program);
registerGroupsCommand(program);

program.parse();
