import { readFileSync } from "node:fs";

export interface CliOutput {
  log(message: string): void;
  error(message: string): void;
}

const HELP = `NewsMCP installer

Usage:
  newsmcp setup --client <codex|claude-code>
  newsmcp doctor --client <codex|claude-code>
  newsmcp --version
  newsmcp --help
`;

export async function run(
  args: readonly string[],
  output: CliOutput = console,
): Promise<number> {
  const [command] = args;

  if (command === undefined || command === "--help" || command === "-h") {
    output.log(HELP.trimEnd());
    return 0;
  }

  if (command === "--version" || command === "-v") {
    output.log(readPackageVersion());
    return 0;
  }

  output.error(`Unknown command: ${command}`);
  output.error("Run newsmcp --help for usage.");
  return 1;
}

function readPackageVersion(): string {
  const packageUrl = new URL("../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageUrl, "utf8")) as {
    version?: unknown;
  };
  if (typeof packageJson.version !== "string") {
    throw new Error("Package version is missing.");
  }
  return packageJson.version;
}
