import os from "node:os";
import path from "node:path";

import type { ClientName } from "../constants.js";

export interface ClientPaths {
  configRoot: string;
  skillsRoot: string;
  stateRoot: string;
}

export function resolveClientPaths(
  client: ClientName,
  env: NodeJS.ProcessEnv = process.env,
): ClientPaths {
  const home = env.HOME ?? env.USERPROFILE ?? os.homedir();
  const configRoot =
    client === "codex"
      ? env.CODEX_HOME ?? path.join(home, ".codex")
      : env.CLAUDE_CONFIG_DIR ?? path.join(home, ".claude");
  return {
    configRoot,
    skillsRoot: path.join(configRoot, "skills"),
    stateRoot: path.join(configRoot, ".newsmcp"),
  };
}
