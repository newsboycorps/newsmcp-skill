import { MCP_NAME, MCP_URL, type ClientName } from "../constants.js";
import type { ProcessRunner } from "../system/process-runner.js";
import type { ClientAdapter, McpInspection } from "./types.js";

export class ClaudeCodeAdapter implements ClientAdapter {
  readonly name: ClientName = "claude-code";
  readonly executable = "claude";

  async inspect(runner: ProcessRunner): Promise<McpInspection> {
    const list = await runner.run(this.executable, ["mcp", "list"]);
    if (list.status !== 0) {
      throw new Error("Unable to inspect Claude Code MCP registrations.");
    }
    const names = parseMcpNames(list.stdout);
    const inspections = await Promise.all(
      names.map(async (name) => ({
        name,
        result: await runner.run(this.executable, ["mcp", "get", name]),
      })),
    );
    const named = inspections.find(({ name }) => name === MCP_NAME);
    const equivalent = inspections.find(({ result }) => parseUrl(result.stdout) === MCP_URL);

    if (named !== undefined && parseUrl(named.result.stdout) !== MCP_URL) {
      return {
        state: "conflict",
        name: MCP_NAME,
        authenticated: undefined,
        detail: `Claude Code already has an MCP server named ${MCP_NAME} with a different URL.`,
      };
    }
    if (named !== undefined) {
      return {
        state: "matching",
        name: named.name,
        authenticated: parseAuthentication(named.result.stdout),
      };
    }
    if (equivalent === undefined) {
      return { state: "absent", name: MCP_NAME, authenticated: false };
    }
    return {
      state: "rename_required",
      name: equivalent.name,
      authenticated: parseAuthentication(equivalent.result.stdout),
    };
  }

  async remove(runner: ProcessRunner, name: string): Promise<void> {
    const result = await runner.run(this.executable, ["mcp", "remove", name]);
    if (result.status !== 0) {
      throw new Error(`Claude Code failed to remove the previous MCP registration: ${name}.`);
    }
  }

  async register(runner: ProcessRunner): Promise<void> {
    const result = await runner.run(this.executable, [
      "mcp",
      "add",
      "--transport",
      "http",
      "--scope",
      "user",
      MCP_NAME,
      MCP_URL,
    ]);
    if (result.status !== 0) {
      throw new Error("Claude Code failed to register the NewsMCP endpoint.");
    }
  }

  async login(
    runner: ProcessRunner,
    options: { name: string; noBrowser: boolean },
  ): Promise<void> {
    const args = ["mcp", "login"];
    if (options.noBrowser) {
      args.push("--no-browser");
    }
    args.push(options.name);
    const result = await runner.run(this.executable, args, { interactive: true });
    if (result.status !== 0) {
      throw new Error("Claude Code OAuth login did not complete.");
    }
  }
}

function parseMcpNames(output: string): string[] {
  const names = new Set<string>();
  for (const line of output.split("\n")) {
    const match = /^(.*?):\s+/.exec(line.trim());
    if (match?.[1] !== undefined) {
      names.add(match[1]);
    }
  }
  return [...names];
}

function parseUrl(output: string): string | undefined {
  const match = /^\s*URL:\s*(\S+)\s*$/m.exec(output);
  return match?.[1];
}

function parseAuthentication(output: string): boolean | undefined {
  const status = /^\s*Status:\s*(.+)$/m.exec(output)?.[1]?.toLowerCase();
  if (status?.includes("connected")) {
    return true;
  }
  if (status?.includes("authentication") || status?.includes("login")) {
    return false;
  }
  return undefined;
}
