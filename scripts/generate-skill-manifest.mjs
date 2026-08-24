import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(root, "skills");
const manifestPath = path.join(root, "skills-manifest.json");
const checkOnly = process.argv.includes("--check");

const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const skillEntries = await readdir(skillsRoot, { withFileTypes: true });
const skills = [];

for (const entry of skillEntries.sort((left, right) =>
  left.name.localeCompare(right.name),
)) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) {
    continue;
  }
  const skillRoot = path.join(skillsRoot, entry.name);
  const files = await listFiles(skillRoot);
  if (!files.includes("SKILL.md")) {
    throw new Error(`${entry.name} does not contain SKILL.md`);
  }
  skills.push({
    name: entry.name,
    files: await Promise.all(
      files.map(async (relativePath) => ({
        path: relativePath,
        sha256: sha256(await readFile(path.join(skillRoot, relativePath))),
      })),
    ),
  });
}

const content = `${JSON.stringify(
  {
    schemaVersion: 1,
    packageVersion: packageJson.version,
    skills,
  },
  null,
  2,
)}\n`;

if (checkOnly) {
  const current = await readFile(manifestPath, "utf8").catch(() => "");
  if (current !== content) {
    console.error("skills-manifest.json is out of date.");
    process.exitCode = 1;
  }
} else {
  await writeFile(manifestPath, content, "utf8");
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (entry.name.startsWith(".") || entry.name === "__pycache__") {
      continue;
    }
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Unsupported skill entry: ${relativePath}`);
    }
  }
  return files;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}
