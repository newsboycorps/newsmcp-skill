import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { run } from "../../dist/cli.js";

const MCP_URL = "https://mcp.newsmcp.news/mcp";

function captureOutput() {
  const stdout = [];
  const stderr = [];
  return {
    output: {
      log: (message) => stdout.push(message),
      error: (message) => stderr.push(message),
    },
    stdout,
    stderr,
  };
}

class CodexRunner {
  constructor(entries = []) {
    this.entries = structuredClone(entries);
    this.calls = [];
  }

  async run(command, args, options = {}) {
    this.calls.push({ command, args: [...args], interactive: options.interactive === true });
    assert.equal(command, "codex");

    if (args.join(" ") === "mcp list --json") {
      return success(JSON.stringify(this.entries));
    }
    if (args[0] === "mcp" && args[1] === "add") {
      this.entries.push({
        name: args[2],
        auth_status: "not_logged_in",
        transport: { type: "streamable_http", url: args[4] },
      });
      return success();
    }
    if (args[0] === "mcp" && args[1] === "remove") {
      this.entries = this.entries.filter(({ name }) => name !== args[2]);
      return success();
    }
    if (args[0] === "mcp" && args[1] === "login") {
      const entry = this.entries.find(({ name }) => name === args[2]);
      assert.ok(entry);
      entry.auth_status = "o_auth";
      return success();
    }
    return failure("unexpected mock command");
  }
}

class ClaudeRunner {
  constructor(entries = []) {
    this.entries = structuredClone(entries);
    this.calls = [];
  }

  async run(command, args, options = {}) {
    this.calls.push({ command, args: [...args], interactive: options.interactive === true });
    assert.equal(command, "claude");

    if (args.join(" ") === "mcp list") {
      return success(
        this.entries.length === 0
          ? "No MCP servers configured.\n"
          : this.entries.map(({ name }) => `${name}: configured`).join("\n") + "\n",
      );
    }
    if (args[0] === "mcp" && args[1] === "get") {
      const entry = this.entries.find(({ name }) => name === args[2]);
      if (entry === undefined) {
        return failure("MCP server not found");
      }
      return success(
        `${entry.name}\n  URL: ${entry.url}\n  Status: ${
          entry.authenticated ? "Connected" : "Authentication required"
        }\n`,
      );
    }
    if (args[0] === "mcp" && args[1] === "add") {
      this.entries.push({
        name: args[6],
        url: args[7],
        authenticated: false,
      });
      return success();
    }
    if (args[0] === "mcp" && args[1] === "remove") {
      this.entries = this.entries.filter(({ name }) => name !== args[2]);
      return success();
    }
    if (args[0] === "mcp" && args[1] === "login") {
      const entry = this.entries.find(({ name }) => name === args.at(-1));
      assert.ok(entry);
      entry.authenticated = true;
      return success();
    }
    return failure("unexpected mock command");
  }
}

test("Codex setup installs once and is idempotent on rerun", async (context) => {
  const home = await temporaryHome(context);
  const runner = new CodexRunner();
  const first = captureOutput();

  assert.equal(
    await run(["setup", "--client", "codex"], first.output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  assert.equal(countCalls(runner, "add"), 1);
  assert.equal(countCalls(runner, "login"), 1);
  assert.deepEqual(
    runner.calls.find(({ args }) => args[1] === "login")?.args,
    ["mcp", "login", "newsmcp"],
  );

  const skillPath = path.join(home, ".codex", "skills", "newsmcp-deep-research", "SKILL.md");
  const before = await readFile(skillPath, "utf8");
  const receipt = JSON.parse(
    await readFile(path.join(home, ".codex", ".newsmcp", "installation.json"), "utf8"),
  );
  assert.equal(receipt.mcp.url, MCP_URL);
  assert.equal(receipt.mcp.oauthCompleted, true);
  assert.equal(JSON.stringify(receipt).includes("token"), false);

  const second = captureOutput();
  assert.equal(
    await run(["setup", "--client", "codex"], second.output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  assert.equal(countCalls(runner, "add"), 1);
  assert.equal(countCalls(runner, "login"), 1);
  assert.equal(await readFile(skillPath, "utf8"), before);
  assert.match(second.stdout.join("\n"), /already up to date/);
  assert.match(second.stdout.join("\n"), /Restart Codex/);
});

test("setup migrates an equivalent endpoint to the NewsMCP service name", async (context) => {
  const home = await temporaryHome(context);
  const runner = new CodexRunner([
    {
      name: "legacy-alias",
      auth_status: "o_auth",
      transport: { type: "streamable_http", url: MCP_URL },
    },
  ]);
  const capture = captureOutput();

  assert.equal(
    await run(["setup", "--client", "codex"], capture.output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  assert.equal(countCalls(runner, "add"), 1);
  assert.equal(countCalls(runner, "remove"), 1);
  assert.equal(countCalls(runner, "login"), 1);
  assert.deepEqual(runner.entries.map(({ name }) => name), ["newsmcp"]);
  assert.match(capture.stdout.join("\n"), /migrated to newsmcp/);
});

test("an older OAuth contract triggers native reauthentication", async (context) => {
  const home = await temporaryHome(context);
  const runner = new CodexRunner();

  assert.equal(
    await run(["setup", "--client", "codex"], captureOutput().output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  const receiptPath = path.join(home, ".codex", ".newsmcp", "installation.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  delete receipt.mcp.oauthContractVersion;
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  assert.equal(
    await run(["setup", "--client", "codex"], captureOutput().output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  assert.equal(countCalls(runner, "login"), 2);
  const updated = JSON.parse(await readFile(receiptPath, "utf8"));
  assert.equal(updated.mcp.oauthContractVersion, 2);
});

test("MCP name conflict fails before writing skill state", async (context) => {
  const home = await temporaryHome(context);
  const runner = new CodexRunner([
    {
      name: "newsmcp",
      auth_status: "o_auth",
      transport: { type: "streamable_http", url: "https://example.invalid/mcp" },
    },
  ]);
  const capture = captureOutput();

  assert.equal(
    await run(["setup", "--client", "codex"], capture.output, {
      env: isolatedEnv(home),
      runner,
    }),
    1,
  );
  assert.match(capture.stderr.join("\n"), /different URL/);
  await assert.rejects(
    readFile(path.join(home, ".codex", "skills", "newsmcp-deep-research", "SKILL.md")),
    { code: "ENOENT" },
  );
});

test("modified skills require force and are backed up before replacement", async (context) => {
  const home = await temporaryHome(context);
  const runner = new CodexRunner();

  assert.equal(
    await run(["setup", "--client", "codex"], captureOutput().output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  const skillPath = path.join(home, ".codex", "skills", "newsmcp-deep-research", "SKILL.md");
  await writeFile(skillPath, "local change\n", "utf8");

  const blocked = captureOutput();
  assert.equal(
    await run(["setup", "--client", "codex"], blocked.output, {
      env: isolatedEnv(home),
      runner,
    }),
    1,
  );
  assert.match(blocked.stderr.join("\n"), /--force/);
  assert.equal(await readFile(skillPath, "utf8"), "local change\n");

  const forced = captureOutput();
  assert.equal(
    await run(["setup", "--client", "codex", "--force"], forced.output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  assert.notEqual(await readFile(skillPath, "utf8"), "local change\n");
  assert.match(forced.stdout.join("\n"), /backed up/);
});

test("Claude Code setup registers and authenticates through its native CLI", async (context) => {
  const home = await temporaryHome(context);
  const runner = new ClaudeRunner();
  const capture = captureOutput();

  assert.equal(
    await run(["setup", "--client", "claude-code", "--no-browser"], capture.output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  const add = runner.calls.find(({ args }) => args[1] === "add");
  assert.deepEqual(add?.args, [
    "mcp",
    "add",
    "--transport",
    "http",
    "--scope",
    "user",
    "newsmcp",
    MCP_URL,
  ]);
  const login = runner.calls.find(({ args }) => args[1] === "login");
  assert.deepEqual(login?.args, ["mcp", "login", "--no-browser", "newsmcp"]);
  assert.equal(login?.interactive, true);
  assert.match(capture.stdout.join("\n"), /Restart Claude Code/);
});

test("Claude Code migrates an equivalent endpoint and starts fresh OAuth", async (context) => {
  const home = await temporaryHome(context);
  const runner = new ClaudeRunner([
    { name: "legacy-alias", url: MCP_URL, authenticated: true },
  ]);

  assert.equal(
    await run(["setup", "--client", "claude-code"], captureOutput().output, {
      env: isolatedEnv(home),
      runner,
    }),
    0,
  );
  assert.equal(countCalls(runner, "add"), 1);
  assert.equal(countCalls(runner, "remove"), 1);
  assert.equal(countCalls(runner, "login"), 1);
  assert.deepEqual(runner.entries.map(({ name }) => name), ["newsmcp"]);
});

function isolatedEnv(home) {
  return { HOME: home, USERPROFILE: home };
}

async function temporaryHome(context) {
  const root = await mkdtemp(path.join(os.tmpdir(), "newsmcp-test-"));
  context.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

function countCalls(runner, operation) {
  return runner.calls.filter(({ args }) => args[1] === operation).length;
}

function success(stdout = "") {
  return { status: 0, stdout, stderr: "" };
}

function failure(stderr) {
  return { status: 1, stdout: "", stderr };
}
