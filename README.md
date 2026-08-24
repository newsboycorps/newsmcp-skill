# NewsMCP Skills

Open agent skills and installation tooling for [NewsMCP](https://newsmcp.news).

This repository provides reusable NewsMCP workflows for agent clients such as
Claude Code and Codex, together with a CLI that installs the skills, registers
the remote MCP server, and starts the client's native OAuth login flow.

## Recommended setup

Use the npm installer for the simplest install and update path. Running the
same command again upgrades the bundled skills and repairs missing setup
without duplicating a matching MCP registration.

```bash
# Codex
npx --yes @newsboycorps/newsmcp@latest setup --client codex

# Claude Code
npx --yes @newsboycorps/newsmcp@latest setup --client claude-code
```

The installer delegates OAuth to the selected client. It does not read or
store access or refresh tokens.

## Alternative installation methods

Choose one installation method per client. Do not combine the npm installer,
standalone skill installer, and plugin installation for the same client.

### Standalone skills

This installs the skills only. Register and authenticate the NewsMCP endpoint
separately.

```bash
npx --yes skills add newsboycorps/newsmcp-skills
npx --yes skills update newsmcp-deep-research
```

### Claude Code plugin

```text
/plugin marketplace add newsboycorps/newsmcp-skills
/plugin install newsmcp@newsmcp-skills
```

Open `/mcp` after installation to complete OAuth when prompted. Update with
`/plugin marketplace update newsmcp-skills`, then
`/plugin update newsmcp@newsmcp-skills` and restart Claude Code.

### Codex plugin

```bash
codex plugin marketplace add newsboycorps/newsmcp-skills
codex plugin add newsmcp@newsmcp-skills

# Refresh the marketplace before reinstalling a newer plugin release.
codex plugin marketplace upgrade newsmcp-skills
codex plugin add newsmcp@newsmcp-skills
```

Restart Codex after installing or updating a plugin, then complete NewsMCP
OAuth when prompted.

## Included skills

- `newsmcp-deep-research`: bounded date-window search, pagination, full-article
  reading, evidence-gap follow-up, and cited synthesis.

## Development

```bash
pnpm install
pnpm test
pnpm release:check
```

The root `skills/` directory is canonical. `pnpm sync:plugins` refreshes the
plugin copy, and `pnpm check:plugins` rejects release drift.

Release checks run the packed npm artifact twice against a temporary home and
fake client CLI. They never inspect the developer's real agent configuration.
