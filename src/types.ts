export interface EnvEntry {
  name: string;
  value: string;
  category: string;
}

export interface Snapshot {
  createdAt: string;
  variables: Record<string, string>;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  modified: { name: string; oldValue: string; newValue: string }[];
}

export interface EnvGroup {
  name: string;
  description?: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvGroupsConfig {
  version: string;
  groups: Record<string, EnvGroup>;
}
