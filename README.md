# NewsMCP Skills

Skills and installation tools for using NewsMCP with AI agents.
They help agents search bounded date ranges, inspect additional pages, read full
articles, produce evidence-based results, and turn that research into reviewed
newsletters.

## Install

Requires Node.js 20 or later. The installer adds the skills, connects NewsMCP,
and delegates OAuth authentication to the selected client. Users only complete
the normal NewsMCP sign-in and consent flow. The installer does not ask users to
choose scopes; the NewsMCP OAuth server applies the service's default permissions.

```bash
# Codex
npx --yes @newsboycorps/newsmcp@latest setup --client codex

# Claude Code
npx --yes @newsboycorps/newsmcp@latest setup --client claude-code
```

Run the same command again to update.

The installer registers the service as `newsmcp`. An existing registration for
the same endpoint under another name is migrated automatically, followed by a
fresh OAuth login so the current default permissions are applied. Restart the
selected agent client after setup before using newly installed tools.

## Included skills

- `newsmcp-deep-research`: Searches news by date range, follows pagination,
  reads full articles, investigates evidence gaps, and produces a cited synthesis.
- `newsmcp-newsletter`: Uses deep research when new evidence is needed, follows
  the current NewsMCP theme contract, validates a draft, and requires approval
  before publishing. Install both skills together because new research is a
  required prerequisite for research-backed newsletters.

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
