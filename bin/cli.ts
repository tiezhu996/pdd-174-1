#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import {
  listEnv,
  exportSnapshot,
  diffSnapshot,
  copyValue,
} from "../src/index";

program
  .name("pdd-174")
  .description("Environment variable inspector with snapshot and diff support")
  .version("1.0.0");

program
  .command("list")
  .description("List all environment variables by category")
  .option("-f, --filter <keyword>", "Filter variables by keyword")
  .action(async (options) => {
    try {
      await listEnv(options.filter);
    } catch (err) {
      console.error(chalk.red("Error:"), err);
      process.exit(1);
    }
  });

program
  .command("export")
  .description("Export current environment snapshot to a file")
  .argument("<file>", "Output file path")
  .action(async (file: string) => {
    try {
      await exportSnapshot(file);
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

program.parse();
