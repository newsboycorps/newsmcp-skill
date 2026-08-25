import type { ClientName } from "../constants.js";
import type { ProcessRunner } from "../system/process-runner.js";

export interface McpInspection {
  state: "absent" | "matching" | "rename_required" | "conflict";
  name: string;
  authenticated: boolean | undefined;
  detail?: string;
}

export interface ClientAdapter {
  readonly name: ClientName;
  readonly executable: string;
  inspect(runner: ProcessRunner): Promise<McpInspection>;
  register(runner: ProcessRunner): Promise<void>;
  remove(runner: ProcessRunner, name: string): Promise<void>;
  login(
    runner: ProcessRunner,
    options: { name: string; noBrowser: boolean },
  ): Promise<void>;
}
