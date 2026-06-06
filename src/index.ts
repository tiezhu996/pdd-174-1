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
  readGroupsConfig,
  writeGroupsConfig,
  getGroupsConfigPath,
} from "./utils";
import { Snapshot, DiffResult, EnvGroup } from "./types";

export async function listEnv(filter?: string, group?: string): Promise<void> {
  const env = process.env;
  let entries = Object.entries(env).map(([name, value]) => ({
    name,
    value: value || "",
    category: classifyEnv(name),
  }));

  if (group) {
    const config = readGroupsConfig();
    if (!config.groups[group]) {
      throw new Error(`Group "${group}" not found`);
    }
    const g = config.groups[group];
    entries = entries.filter((e) => g.variables.includes(e.name));
  }

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

export async function exportSnapshot(filePath: string, group?: string): Promise<void> {
  let variables: Record<string, string>;
  if (group) {
    const config = readGroupsConfig();
    if (!config.groups[group]) {
      throw new Error(`Group "${group}" not found`);
    }
    const g = config.groups[group];
    variables = {};
    for (const v of g.variables) {
      const val = process.env[v];
      if (val !== undefined) {
        variables[v] = val;
      }
    }
  } else {
    variables = { ...process.env } as Record<string, string>;
  }
  const snapshot: Snapshot = {
    createdAt: new Date().toISOString(),
    variables,
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

export async function listGroups(): Promise<void> {
  const config = readGroupsConfig();
  const names = Object.keys(config.groups);
  if (names.length === 0) {
    console.log(chalk.yellow("No groups defined yet. Create one with: pdd-174 group create <name>"));
    console.log(chalk.gray(`Config file: ${getGroupsConfigPath()}`));
    return;
  }
  console.log(chalk.bold.cyan(`\nSaved environment groups (${names.length}):`));
  console.log(chalk.gray(`Config file: ${getGroupsConfigPath()}\n`));
  for (const name of names) {
    const g = config.groups[name];
    const desc = g.description ? chalk.gray(` - ${g.description}`) : "";
    console.log(`  ${chalk.yellow(g.name)}${desc}`);
    console.log(`    ${chalk.gray(`Variables (${g.variables.length}): ${g.variables.join(", ")}`)}`);
    console.log(`    ${chalk.gray(`Updated: ${g.updatedAt}`)}`);
  }
}

export async function createGroup(name: string, variables: string[], description?: string): Promise<void> {
  const config = readGroupsConfig();
  if (config.groups[name]) {
    throw new Error(`Group "${name}" already exists. Use "group add" to add variables.`);
  }
  const now = new Date().toISOString();
  const group: EnvGroup = {
    name,
    description,
    variables: Array.from(new Set(variables)),
    createdAt: now,
    updatedAt: now,
  };
  config.groups[name] = group;
  writeGroupsConfig(config);
  console.log(chalk.green(`Created group "${name}" with ${group.variables.length} variable(s).`));
}

export async function deleteGroup(name: string): Promise<void> {
  const config = readGroupsConfig();
  if (!config.groups[name]) {
    throw new Error(`Group "${name}" not found.`);
  }
  delete config.groups[name];
  writeGroupsConfig(config);
  console.log(chalk.green(`Deleted group "${name}".`));
}

export async function showGroup(name: string): Promise<void> {
  const config = readGroupsConfig();
  const group = config.groups[name];
  if (!group) {
    throw new Error(`Group "${name}" not found.`);
  }
  const desc = group.description ? chalk.gray(` - ${group.description}`) : "";
  console.log(chalk.bold.cyan(`\n[Group: ${group.name}]${desc}`));
  console.log(chalk.gray(`  Created: ${group.createdAt}`));
  console.log(chalk.gray(`  Updated: ${group.updatedAt}`));
  console.log(chalk.bold(`  Variables (${group.variables.length}):`));
  for (const v of group.variables) {
    const raw = process.env[v];
    const exists = raw !== undefined;
    const value = exists ? (isSensitive(v) ? maskValue(raw) : raw) : chalk.red("(not set)");
    const status = exists ? chalk.green("[OK]") : chalk.red("[MISSING]");
    console.log(`    ${chalk.yellow(v)}=${value} ${status}`);
  }
}

export async function addToGroup(name: string, variable: string): Promise<void> {
  const config = readGroupsConfig();
  const group = config.groups[name];
  if (!group) {
    throw new Error(`Group "${name}" not found.`);
  }
  if (group.variables.includes(variable)) {
    console.log(chalk.yellow(`Variable "${variable}" already in group "${name}".`));
    return;
  }
  group.variables.push(variable);
  group.updatedAt = new Date().toISOString();
  writeGroupsConfig(config);
  console.log(chalk.green(`Added "${variable}" to group "${name}".`));
}

export async function removeFromGroup(name: string, variable: string): Promise<void> {
  const config = readGroupsConfig();
  const group = config.groups[name];
  if (!group) {
    throw new Error(`Group "${name}" not found.`);
  }
  const idx = group.variables.indexOf(variable);
  if (idx === -1) {
    throw new Error(`Variable "${variable}" not in group "${name}".`);
  }
  group.variables.splice(idx, 1);
  group.updatedAt = new Date().toISOString();
  writeGroupsConfig(config);
  console.log(chalk.green(`Removed "${variable}" from group "${name}".`));
}
