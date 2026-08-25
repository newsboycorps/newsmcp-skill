import {
  MCP_NAME,
  MCP_URL,
  type ClientName,
} from "../constants.js";
import type { ProcessRunner } from "../system/process-runner.js";
import type { ClientAdapter, McpInspection } from "./types.js";

interface CodexMcpEntry {
  name?: unknown;
  auth_status?: unknown;
  transport?: {
    type?: unknown;
    url?: unknown;
  };
}

export class CodexAdapter implements ClientAdapter {
  readonly name: ClientName = "codex";
  readonly executable = "codex";

  async inspect(runner: ProcessRunner): Promise<McpInspection> {
    const result = await runner.run(this.executable, ["mcp", "list", "--json"]);
    if (result.status !== 0) {
      throw new Error("Unable to inspect Codex MCP registrations.");
    }
    const entries = JSON.parse(result.stdout) as CodexMcpEntry[];
    const named = entries.find((entry) => entry.name === MCP_NAME);
    const equivalent = entries.find(
      (entry) => entry.transport?.url === MCP_URL,
    );

    if (named !== undefined && named.transport?.url !== MCP_URL) {
      return {
        state: "conflict",
        name: MCP_NAME,
        authenticated: undefined,
        detail: `Codex already has an MCP server named ${MCP_NAME} with a different URL.`,
      };
    }
    if (named !== undefined && typeof named.name === "string") {
      return {
        state: "matching",
        name: named.name,
        authenticated: named.auth_status === "o_auth",
      };
    }
    if (equivalent === undefined || typeof equivalent.name !== "string") {
      return { state: "absent", name: MCP_NAME, authenticated: false };
    }
    return {
      state: "rename_required",
      name: equivalent.name,
      authenticated: equivalent.auth_status === "o_auth",
    };
  }

  async remove(runner: ProcessRunner, name: string): Promise<void> {
    const result = await runner.run(this.executable, ["mcp", "remove", name]);
    if (result.status !== 0) {
      throw new Error(`Codex failed to remove the previous MCP registration: ${name}.`);
    }
  }

  async register(runner: ProcessRunner): Promise<void> {
    const result = await runner.run(this.executable, [
      "mcp",
      "add",
      MCP_NAME,
      "--url",
      MCP_URL,
    ]);
    if (result.status !== 0) {
      throw new Error("Codex failed to register the NewsMCP endpoint.");
    }
  }

  async login(
    runner: ProcessRunner,
    options: { name: string; noBrowser: boolean },
  ): Promise<void> {
    if (options.noBrowser) {
      throw new Error("Codex does not support --no-browser for MCP login.");
    }
    const result = await runner.run(
      this.executable,
      ["mcp", "login", options.name],
      { interactive: true },
    );
    if (result.status !== 0) {
      throw new Error("Codex OAuth login did not complete.");
    }
  }
}
