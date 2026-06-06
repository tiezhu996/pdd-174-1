# pdd-174

Environment variable inspector with snapshot and diff support.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

```bash
# List all environment variables by category
node bin/cli.js list

# Filter variables by keyword
node bin/cli.js list --filter NODE

# Export current environment snapshot
node bin/cli.js export env-snapshot.json

# Compare current environment with a snapshot
node bin/cli.js diff env-snapshot.json

# Copy a variable value to clipboard
node bin/cli.js copy PATH
```

After build, the CLI is available via:

```bash
npm run build
npx pdd-174 list
```
