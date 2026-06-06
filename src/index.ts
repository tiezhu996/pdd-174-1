import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import chalk from "chalk";
import {
  classifyEnv,
  isSensitive,
  maskValue,
  validateEnvValue,
  readSnapshot,
  writeSnapshot,
} from "./utils";
import { Snapshot, DiffResult } from "./types";

export async function listEnv(filter?: string): Promise<void> {
  const env = process.env;
  const entries = Object.entries(env).map(([name, value]) => ({
    name,
    value: value || "",
    category: classifyEnv(name),
  }));

  const filtered = filter
    ? entries.filter(
        (e) =>
          e.name.toLowerCase().includes(filter.toLowerCase()) ||
          e.value.toLowerCase().includes(filter.toLowerCase())
      )
    : entries;

  const grouped: Record<string, typeof entries> = {};
  for (const e of filtered) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  }

  const categoryOrder = ["PATH", "AUTH", "DEV", "DATABASE", "SYSTEM", "OTHER"];
  for (const cat of categoryOrder) {
    const group = grouped[cat];
    if (!group || group.length === 0) continue;
    console.log(chalk.bold.cyan(`\n[${cat}]`));
    for (const { name, value } of group) {
      const displayValue = isSensitive(name) ? maskValue(value) : value;
      const validation = validateEnvValue(name, value);
      const status = validation
        ? chalk.red(`[${validation}]`)
        : chalk.green("[OK]");
      console.log(`  ${chalk.yellow(name)}=${displayValue} ${status}`);
    }
  }
}

export async function exportSnapshot(filePath: string): Promise<void> {
  const snapshot: Snapshot = {
    createdAt: new Date().toISOString(),
    variables: { ...process.env } as Record<string, string>,
  };
  const resolved = path.resolve(filePath);
  writeSnapshot(resolved, snapshot);
  console.log(chalk.green(`Snapshot saved to ${resolved}`));
}

export async function diffSnapshot(filePath: string): Promise<void> {
  const snapshot = readSnapshot(filePath);
  const current = process.env as Record<string, string>;
  const oldVars = snapshot.variables;

  const result: DiffResult = {
    added: [],
    removed: [],
    modified: [],
  };

  for (const name of Object.keys(current)) {
    if (!(name in oldVars)) {
      result.added.push(name);
    } else if (oldVars[name] !== current[name]) {
      result.modified.push({
        name,
        oldValue: oldVars[name],
        newValue: current[name],
      });
    }
  }
  for (const name of Object.keys(oldVars)) {
    if (!(name in current)) {
      result.removed.push(name);
    }
  }

  if (result.added.length === 0 && result.removed.length === 0 && result.modified.length === 0) {
    console.log(chalk.green("No differences found."));
    return;
  }

  if (result.added.length > 0) {
    console.log(chalk.bold.green(`\nAdded (${result.added.length}):`));
    for (const name of result.added) {
      const value = isSensitive(name) ? maskValue(current[name]) : current[name];
      console.log(`  + ${chalk.yellow(name)}=${value}`);
    }
  }

  if (result.removed.length > 0) {
    console.log(chalk.bold.red(`\nRemoved (${result.removed.length}):`));
    for (const name of result.removed) {
      const value = isSensitive(name) ? maskValue(oldVars[name]) : oldVars[name];
      console.log(`  - ${chalk.yellow(name)}=${value}`);
    }
  }

  if (result.modified.length > 0) {
    console.log(chalk.bold.yellow(`\nModified (${result.modified.length}):`));
    for (const { name, oldValue, newValue } of result.modified) {
      const oldDisplay = isSensitive(name) ? maskValue(oldValue) : oldValue;
      const newDisplay = isSensitive(name) ? maskValue(newValue) : newValue;
      console.log(`  ~ ${chalk.yellow(name)}`);
      console.log(`    ${chalk.red("- " + oldDisplay)}`);
      console.log(`    ${chalk.green("+ " + newDisplay)}`);
    }
  }
}

export async function copyValue(name: string): Promise<void> {
  const value = process.env[name];
  if (value === undefined) {
    console.error(chalk.red(`Environment variable ${name} not found`));
    process.exit(1);
  }

  const platform = os.platform();
  let cmd: string;
  let args: string[];

  if (platform === "darwin") {
    cmd = "pbcopy";
    args = [];
  } else if (platform === "win32") {
    cmd = "clip";
    args = [];
  } else {
    cmd = "xclip";
    args = ["-selection", "clipboard"];
  }

  const child = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
  child.stdin.write(value);
  child.stdin.end();

  await new Promise<void>((resolve, reject) => {
    child.on("error", (err) => {
      reject(new Error(`Failed to copy to clipboard: ${err.message}`));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Clipboard command exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });

  console.log(chalk.green(`Copied ${name} to clipboard`));
}
