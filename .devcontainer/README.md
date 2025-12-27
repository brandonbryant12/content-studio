# Continuous Claude Agent Dev Container

This dev container provides a safe, isolated environment for running Claude Code continuously with restricted network access.

## Features

- **Node.js 22** with pnpm 10.23.0
- **Claude Code** pre-installed
- **Firewall protection** - Only whitelisted domains accessible
- **Persistent volumes** - Command history and Claude config preserved
- **Docker-in-Docker** - Run containers inside the container
- **Git + GitHub CLI** - Full git workflow support

## Quick Start

### Option 1: VS Code Dev Containers (Recommended)

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open this project in VS Code
3. Click "Reopen in Container" when prompted (or run `Dev Containers: Reopen in Container` from command palette)
4. Wait for the container to build and start

### Option 2: GitHub Codespaces

1. Go to the repository on GitHub
2. Click "Code" → "Codespaces" → "Create codespace on main"

### Option 3: CLI (devcontainer CLI)

```bash
# Install the CLI
npm install -g @devcontainers/cli

# Build and start
devcontainer up --workspace-folder .

# Exec into the container
devcontainer exec --workspace-folder . zsh
```

## Running Continuous Claude Agent

Once inside the container:

```bash
# Authenticate with your Anthropic API key
export ANTHROPIC_API_KEY="your-key-here"

# Or use Claude's built-in auth
claude login

# Start Claude Code
claude

# For continuous/autonomous mode, you might use:
claude --dangerously-skip-permissions  # Only in this sandboxed container!
```

## Network Access (Firewall)

The container has a restrictive firewall that only allows:

| Service | Purpose |
|---------|---------|
| GitHub (api, web, git) | Code hosting, git operations |
| registry.npmjs.org | Package installation |
| api.anthropic.com | Claude API |
| sentry.io | Error tracking |
| VS Code marketplace | Extensions |
| Vercel, Supabase | Common dev services |

**To add more domains**, edit `init-firewall.sh` and add to the `ALLOWED_DOMAINS` array.

## Volumes (Persistent Data)

| Volume | Path | Purpose |
|--------|------|---------|
| `content-studio-bashhistory-*` | `/commandhistory` | Shell history |
| `content-studio-claude-config-*` | `/home/node/.claude` | Claude Code config |
| `content-studio-anthropic-*` | `/home/node/.anthropic` | Anthropic credentials |

## Environment Variables

Set these on your host machine before starting:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export TZ="America/New_York"  # Optional, defaults to LA
```

## Customization

### Adding packages to the container

Edit `Dockerfile` and add to the `apt-get install` line.

### Adding VS Code extensions

Edit `devcontainer.json` → `customizations.vscode.extensions`.

### Increasing memory

Edit `devcontainer.json` → `containerEnv.NODE_OPTIONS`.

## Troubleshooting

### Firewall blocking needed service

1. Check what's being blocked: `sudo iptables -L -v -n`
2. Add the domain to `ALLOWED_DOMAINS` in `init-firewall.sh`
3. Re-run: `sudo /usr/local/bin/init-firewall.sh`

### Container won't start

```bash
# Check Docker is running
docker info

# Try building manually
docker build -t content-studio-devcontainer .devcontainer/
```

### Claude Code not working

```bash
# Check it's installed
which claude

# Check version
claude --version

# Re-authenticate
claude logout && claude login
```
