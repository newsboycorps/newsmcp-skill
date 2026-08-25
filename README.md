# NewsMCP Skills

Skills and installation tools for using NewsMCP with AI agents.
They help agents search bounded date ranges, inspect additional pages, read full
articles, and produce evidence-based results.

## Install

Requires Node.js 20 or later. The installer adds the skills, connects NewsMCP,
and delegates OAuth authentication to the selected client.

```bash
# Codex
npx --yes @newsboycorps/newsmcp@latest setup --client codex

# Claude Code
npx --yes @newsboycorps/newsmcp@latest setup --client claude-code
```

Run the same command again to update.

## Included skill

- `newsmcp-deep-research`: Searches news by date range, follows pagination,
  reads full articles, investigates evidence gaps, and produces a cited synthesis.

## Install the skill only

Use this command to install the skill files without configuring MCP:

```bash
npx --yes skills add newsboycorps/newsmcp-skill --all -g
```

## Development

```bash
pnpm install
pnpm release:check
```

## License

[MIT](LICENSE)
