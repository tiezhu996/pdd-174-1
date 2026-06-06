#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import {
  listEnv,
  exportSnapshot,
  diffSnapshot,
  copyValue,
  listGroups,
  createGroup,
  deleteGroup,
  showGroup,
  addToGroup,
  removeFromGroup,
} from "../src/index";

program
  .name("pdd-174")
  .description("Environment variable inspector with snapshot and diff support")
  .version("1.0.0");

program
  .command("list")
  .description("List all environment variables by category")
  .option("-f, --filter <keyword>", "Filter variables by keyword")
  .option("-g, --group <name>", "Show only variables in a saved group")
  .action(async (options) => {
    try {
      await listEnv(options.filter, options.group);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

program
  .command("export")
  .description("Export current environment snapshot to a file")
  .argument("<file>", "Output file path")
  .option("-g, --group <name>", "Export only variables in a saved group")
  .action(async (file: string, options) => {
    try {
      await exportSnapshot(file, options.group);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

program
  .command("diff")
  .description("Compare current environment with a saved snapshot")
  .argument("<file>", "Snapshot file path")
  .action(async (file: string) => {
    try {
      await diffSnapshot(file);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

program
  .command("copy")
  .description("Copy the value of an environment variable to clipboard")
  .argument("<name>", "Environment variable name")
  .action(async (name: string) => {
    try {
      await copyValue(name);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

const groupCmd = program
  .command("group")
  .description("Manage named environment variable groups");

groupCmd
  .command("list")
  .description("List all saved groups")
  .action(async () => {
    try {
      await listGroups();
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

groupCmd
  .command("create")
  .description("Create a new group")
  .argument("<name>", "Group name")
  .argument("<variables...>", "Variable names to include in the group")
  .option("-d, --description <text>", "Optional description for the group")
  .action(async (name: string, variables: string[], opts: { description?: string }) => {
    try {
      await createGroup(name, variables, opts.description);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

groupCmd
  .command("delete")
  .description("Delete a group")
  .argument("<name>", "Group name")
  .action(async (name: string) => {
    try {
      await deleteGroup(name);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

groupCmd
  .command("show")
  .description("Show variables and current values of a group")
  .argument("<name>", "Group name")
  .action(async (name: string) => {
    try {
      await showGroup(name);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

groupCmd
  .command("add")
  .description("Add a variable to a group")
  .argument("<name>", "Group name")
  .argument("<variable>", "Variable name to add")
  .action(async (name: string, variable: string) => {
    try {
      await addToGroup(name, variable);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

groupCmd
  .command("remove")
  .description("Remove a variable from a group")
  .argument("<name>", "Group name")
  .argument("<variable>", "Variable name to remove")
  .action(async (name: string, variable: string) => {
    try {
      await removeFromGroup(name, variable);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

program.parse();
