import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Snapshot, EnvGroupsConfig } from "./types";

export const CATEGORIES: Record<string, string[]> = {
  PATH: ["PATH", "HOME", "PWD", "OLDPWD", "CDPATH"],
  AUTH: [
    "TOKEN",
    "API_KEY",
    "SECRET",
    "PASSWORD",
    "PASSWD",
    "CREDENTIAL",
    "AUTH",
    "PRIVATE_KEY",
    "ACCESS_KEY",
    "AWS_SECRET",
    "GITHUB_TOKEN",
    "NPM_TOKEN",
  ],
  DEV: [
    "NODE",
    "NPM",
    "YARN",
    "PNPM",
    "JAVA",
    "PYTHON",
    "GO",
    "RUST",
    "DOCKER",
    "KUBERNETES",
    "KUBECONFIG",
    "VSCODE",
    "EDITOR",
    "GIT",
    "ANDROID",
    "FLUTTER",
    "DART",
    "RUBY",
    "GEM",
    "BUNDLE",
  ],
  SYSTEM: [
    "SHELL",
    "TERM",
    "USER",
    "HOSTNAME",
    "LANG",
    "LC_",
    "LOGNAME",
    "TMPDIR",
    "XDG",
    "DISPLAY",
    "SSH",
    "MAIL",
  ],
  DATABASE: [
    "DATABASE_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASS",
    "DB_NAME",
    "REDIS",
    "MONGO",
    "POSTGRES",
    "MYSQL",
    "SQLITE",
  ],
};

export function classifyEnv(name: string): string {
  const upper = name.toUpperCase();
  for (const [cat, keys] of Object.entries(CATEGORIES)) {
    if (keys.some((k) => upper.includes(k))) return cat;
  }
  return "OTHER";
}

export function isSensitive(name: string): boolean {
  const upper = name.toUpperCase();
  const sensitives = [
    "PASS",
    "SECRET",
    "TOKEN",
    "KEY",
    "CREDENTIAL",
    "PRIVATE",
    "AUTH",
    "API_KEY",
  ];
  return sensitives.some((s) => upper.includes(s));
}

export function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "****" + value.slice(-2);
}

export function validateEnvValue(name: string, value: string): string | null {
  const upper = name.toUpperCase();
  if (upper.includes("NODE") && upper.includes("PATH")) {
    if (!fs.existsSync(value)) return "Path does not exist";
  }
  if (upper.includes("DATABASE_URL") || upper.includes("DB_")) {
    const dbUrlPattern =
      /^(postgres|mysql|mongodb|redis|sqlite):\/\/[^\s]+$/;
    if (value && !dbUrlPattern.test(value) && !upper.includes("HOST") && !upper.includes("PORT") && !upper.includes("USER") && !upper.includes("NAME")) {
      return "Invalid database connection string format";
    }
  }
  if (upper === "PATH") {
    const parts = value.split(path.delimiter);
    const missing = parts.filter((p) => !fs.existsSync(p));
    if (missing.length > 0) {
      return `${missing.length} path segment(s) do not exist`;
    }
  }
  return null;
}

export function readSnapshot(filePath: string): Snapshot {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Snapshot;
}

export function writeSnapshot(filePath: string, snapshot: Snapshot): void {
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
}

const CONFIG_DIR = path.join(os.homedir(), ".pdd-174");
const GROUPS_FILE = path.join(CONFIG_DIR, "groups.json");

export function getGroupsConfigPath(): string {
  return GROUPS_FILE;
}

function createDefaultConfig(): EnvGroupsConfig {
  return {
    version: "1.0",
    groups: {},
  };
}

export function readGroupsConfig(): EnvGroupsConfig {
  if (!fs.existsSync(GROUPS_FILE)) {
    const config = createDefaultConfig();
    writeGroupsConfig(config);
    return config;
  }
  try {
    const raw = fs.readFileSync(GROUPS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as EnvGroupsConfig;
    if (!parsed.version || !parsed.groups) {
      return createDefaultConfig();
    }
    return parsed;
  } catch {
    return createDefaultConfig();
  }
}

export function writeGroupsConfig(config: EnvGroupsConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(GROUPS_FILE, JSON.stringify(config, null, 2), "utf-8");
}
