import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform === "win32") {
  console.log("Packed installer test is skipped on Windows.");
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await mkdtemp(path.join(os.tmpdir(), "newsmcp-packed-test-"));
const packDirectory = path.join(sandbox, "pack");
const installDirectory = path.join(sandbox, "install");
const fakeBin = path.join(sandbox, "bin");
const fakeState = path.join(sandbox, "codex-state.json");
const home = path.join(sandbox, "home");

try {
  await Promise.all([
    mkdir(packDirectory, { recursive: true }),
    mkdir(installDirectory, { recursive: true }),
    mkdir(fakeBin, { recursive: true }),
    mkdir(path.join(home, ".codex"), { recursive: true }),
  ]);
  await writeFakeCodex(path.join(fakeBin, "codex"));
  await writeFile(
    path.join(installDirectory, "package.json"),
    '{"name":"newsmcp-packed-test","private":true}\n',
    "utf8",
  );

  const packed = run("npm", [
    "pack",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    packDirectory,
  ]);
  const [{ filename }] = JSON.parse(packed.stdout);
  const tarball = path.join(packDirectory, filename);
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-package-lock",
    "--no-save",
    tarball,
  ], installDirectory);

  const cli = path.join(
    installDirectory,
    "node_modules",
    "@newsboycorps",
    "newsmcp",
    "dist",
    "bin.js",
  );
  run(process.execPath, [cli, "setup", "--client", "codex"], installDirectory);
  run(process.execPath, [cli, "setup", "--client", "codex"], installDirectory);

  const state = JSON.parse(await readFile(fakeState, "utf8"));
  if (state.addCount !== 1 || state.loginCount !== 1 || state.authenticated !== true) {
    throw new Error(`Packed setup was not idempotent: ${JSON.stringify(state)}`);
  }
  if (state.name !== "newsmcp") {
    throw new Error(`Packed setup used an unexpected MCP service name: ${state.name}`);
  }
  if (state.loginArgs.some((argument) => argument === "--scopes")) {
    throw new Error(`Packed setup passed explicit OAuth scopes: ${JSON.stringify(state.loginArgs)}`);
  }
  await readFile(
    path.join(home, ".codex", "skills", "newsmcp-deep-research", "SKILL.md"),
    "utf8",
  );
  const receiptSource = await readFile(
    path.join(home, ".codex", ".newsmcp", "installation.json"),
    "utf8",
  );
  if (/access[_-]?token|refresh[_-]?token/i.test(receiptSource)) {
    throw new Error("Installation receipt contains token material.");
  }
  const receipt = JSON.parse(receiptSource);
  if (receipt.mcp.name !== "newsmcp" || receipt.mcp.oauthContractVersion !== 2) {
    throw new Error(`Installation receipt has the wrong MCP contract: ${receiptSource}`);
  }
  console.log("Packed installer completed two idempotent setup runs in an isolated home.");
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      CODEX_HOME: path.join(home, ".codex"),
      FAKE_CODEX_STATE: fakeState,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
  return result;
}

async function writeFakeCodex(target) {
  const source = `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const statePath = process.env.FAKE_CODEX_STATE;
let state = {
  registered: false,
  authenticated: false,
  addCount: 0,
  loginCount: 0,
  name: null,
  loginArgs: []
};
try { state = JSON.parse(readFileSync(statePath, "utf8")); } catch {}
const args = process.argv.slice(2);
if (args.join(" ") === "mcp list --json") {
  console.log(JSON.stringify(state.registered ? [{
    name: state.name,
    auth_status: state.authenticated ? "o_auth" : "not_logged_in",
    transport: { type: "streamable_http", url: "https://mcp.newsmcp.news/mcp" }
  }] : []));
} else if (args[0] === "mcp" && args[1] === "add") {
  state.registered = true;
  state.name = args[2];
  state.addCount += 1;
} else if (args[0] === "mcp" && args[1] === "login") {
  state.authenticated = true;
  state.loginArgs = args;
  state.loginCount += 1;
} else {
  process.exitCode = 2;
}
writeFileSync(statePath, JSON.stringify(state));
`;
  await writeFile(target, source, "utf8");
  await chmod(target, 0o755);
}
