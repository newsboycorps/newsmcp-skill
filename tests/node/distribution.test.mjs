import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const endpoint = "https://mcp.newsmcp.news/mcp";

test("Claude and Codex marketplaces expose the same plugin", async () => {
  const claude = await readJson(".claude-plugin/marketplace.json");
  const codex = await readJson(".agents/plugins/marketplace.json");

  assert.equal(claude.plugins[0].name, "newsmcp");
  assert.equal(claude.plugins[0].source, "./plugins/newsmcp");
  assert.equal(codex.plugins[0].name, "newsmcp");
  assert.equal(codex.plugins[0].source.path, "./plugins/newsmcp");
});

test("plugin manifests share package version and MCP endpoint", async () => {
  const packageJson = await readJson("package.json");
  const claude = await readJson("plugins/newsmcp/.claude-plugin/plugin.json");
  const codex = await readJson("plugins/newsmcp/.codex-plugin/plugin.json");
  const mcp = await readJson("plugins/newsmcp/.mcp.json");

  assert.equal(claude.version, packageJson.version);
  assert.equal(codex.version, packageJson.version);
  assert.equal(codex.skills, "./skills/");
  assert.equal(mcp.mcpServers.newsmcp.type, "http");
  assert.equal(mcp.mcpServers.newsmcp.url, endpoint);
  assert.equal(JSON.stringify({ claude, codex, mcp }).includes(root), false);
});

test("installer source uses only the NewsMCP service identity", async () => {
  const sourceFiles = [
    "src/constants.ts",
    "src/clients/codex.ts",
    "src/clients/claude-code.ts",
    "src/commands/setup.ts",
  ];
  for (const sourceFile of sourceFiles) {
    const source = await readFile(path.join(root, sourceFile), "utf8");
    assert.doesNotMatch(source, /newsboy/i, sourceFile);
  }
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
