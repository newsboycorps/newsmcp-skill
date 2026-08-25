import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packDirectory = await mkdtemp(path.join(tmpdir(), "newsmcp-pack-"));

try {
  const result = spawnSync(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", packDirectory],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "npm pack failed");
  }

  const [packed] = JSON.parse(result.stdout);
  const files = packed.files.map((entry) => entry.path).sort();
  assertRequiredFiles(files);
  assertAllowedFiles(files);
  await assertSafeContents(files);
  console.log(`Package contents verified: ${files.length} files.`);
} finally {
  await rm(packDirectory, { recursive: true, force: true });
}

function assertRequiredFiles(files) {
  for (const required of [
    "LICENSE",
    "README.md",
    "dist/bin.js",
    "dist/cli.js",
    "package.json",
    "skills-manifest.json",
    "skills/newsmcp-deep-research/SKILL.md",
    "skills/newsmcp-newsletter/SKILL.md",
    "skills/newsmcp-newsletter/agents/openai.yaml",
  ]) {
    if (!files.includes(required)) {
      throw new Error(`Package is missing ${required}`);
    }
  }
}

function assertAllowedFiles(files) {
  const allowed = /^(LICENSE|README\.md|package\.json|skills-manifest\.json|dist\/|skills\/)/;
  const unexpected = files.filter((file) => !allowed.test(file));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected package files: ${unexpected.join(", ")}`);
  }

  const forbidden = files.filter((file) =>
    /(^|\/)(\.env|\.private-docs|tests|__pycache__|\.git)(\/|$)/.test(file),
  );
  if (forbidden.length > 0) {
    throw new Error(`Forbidden package files: ${forbidden.join(", ")}`);
  }
}

async function assertSafeContents(files) {
  const forbiddenPatterns = [
    { label: "macOS user path", pattern: /\/Users\/[A-Za-z0-9._-]+\// },
    { label: "Windows user path", pattern: /[A-Za-z]:\\Users\\[^\\]+\\/ },
    { label: "private key", pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/ },
  ];

  for (const file of files) {
    const content = await readFile(path.join(root, file), "utf8");
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(content)) {
        throw new Error(`${file} contains a forbidden ${label}`);
      }
    }
  }
}
