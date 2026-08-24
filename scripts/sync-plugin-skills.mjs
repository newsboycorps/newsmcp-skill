import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const pluginRoot = path.join(root, "plugins", "newsmcp");
const sourceSkills = path.join(root, "skills");
const targetSkills = path.join(pluginRoot, "skills");
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  const { default: assert } = await import("node:assert/strict");
  assert.deepEqual(
    await readTree(targetSkills),
    await readTree(sourceSkills),
    "plugin skill mirror is stale; run pnpm sync:plugins",
  );
  for (const manifestPath of [
    path.join(pluginRoot, ".claude-plugin", "plugin.json"),
    path.join(pluginRoot, ".codex-plugin", "plugin.json"),
  ]) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.version, packageJson.version, `${manifestPath} version is stale`);
  }
} else {
  await rm(targetSkills, { recursive: true, force: true });
  await mkdir(pluginRoot, { recursive: true });
  await cp(sourceSkills, targetSkills, { recursive: true });
  for (const manifestPath of [
    path.join(pluginRoot, ".claude-plugin", "plugin.json"),
    path.join(pluginRoot, ".codex-plugin", "plugin.json"),
  ]) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.version = packageJson.version;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
}

async function readTree(directory, prefix = "") {
  const files = {};
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await readTree(path.join(directory, entry.name), relativePath));
    } else if (entry.isFile()) {
      files[relativePath] = await readFile(path.join(directory, entry.name), "utf8");
    } else {
      throw new Error(`Unsupported skill entry: ${relativePath}`);
    }
  }
  return files;
}
