import type { ClientName } from "../constants.js";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { CodexAdapter } from "./codex.js";
import type { ClientAdapter } from "./types.js";

export function createClientAdapter(client: ClientName): ClientAdapter {
  return client === "codex" ? new CodexAdapter() : new ClaudeCodeAdapter();
}
