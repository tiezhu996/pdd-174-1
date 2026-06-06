# pdd-174

Environment variable inspector with snapshot, diff, and named group support.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

### Development mode (via ts-node)

```bash
# List all environment variables by category
npm run dev -- list

# Filter variables by keyword
npm run dev -- list --filter NODE

# Export current environment snapshot
npm run dev -- export env-snapshot.json

# Compare current environment with a snapshot
npm run dev -- diff env-snapshot.json

# Copy a variable value to clipboard
npm run dev -- copy PATH
```

### After build

The compiled CLI entry is `dist/bin/cli.js`, available via:

```bash
npm run build
node dist/bin/cli.js list
# or
npx pdd-174 list
```

### Named environment groups

Save frequently-used variables into named groups, stored as JSON in `~/.pdd-174/groups.json` and reused across projects.

```bash
# Create a new group with variables (with optional description)
npx pdd-174 group create node-dev PATH HOME NODE_PATH NPM_CONFIG_PREFIX -d "Node.js 开发必备变量"

# List all saved groups
npx pdd-174 group list

# Show a group's variables and their current values (sensitive values masked)
npx pdd-174 group show node-dev

# List only variables in a saved group
npx pdd-174 list --group node-dev

# Export a snapshot containing only variables in a saved group
npx pdd-174 export --group node-dev node-env.json

# Add a variable to an existing group
npx pdd-174 group add node-dev EDITOR

# Remove a variable from a group
npx pdd-174 group remove node-dev EDITOR

# Delete an entire group
npx pdd-174 group delete node-dev
```
