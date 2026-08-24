import { spawn } from "node:child_process";

export interface ProcessResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface RunProcessOptions {
  interactive?: boolean;
}

export interface ProcessRunner {
  run(
    command: string,
    args: readonly string[],
    options?: RunProcessOptions,
  ): Promise<ProcessResult>;
}

export class NodeProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: readonly string[],
    options: RunProcessOptions = {},
  ): Promise<ProcessResult> {
    return await new Promise((resolve, reject) => {
      const child = spawn(command, [...args], {
        env: process.env,
        stdio: options.interactive ? "inherit" : ["ignore", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (status) => {
        resolve({
          status: status ?? 1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      });
    });
  }
}
