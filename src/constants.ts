export const MCP_NAME = "newsmcp";
export const LEGACY_MCP_NAMES = ["newsboy"] as const;
export const MCP_URL = "https://mcp.newsmcp.news/mcp";
export const MCP_SCOPES = ["news.search", "news.detail", "offline_access"] as const;

export type ClientName = "codex" | "claude-code";
