import type { ClientName } from "./constants.js";
import { setup, type SetupDependencies, type SetupOptions } from "./commands/setup.js";
import { readPackageVersion } from "./package.js";

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
  dependencies: SetupDependencies = {},
): Promise<number> {
  const [command] = args;

  if (command === undefined || command === "--help" || command === "-h") {
    output.log(HELP.trimEnd());
    return 0;
  }

  if (command === "--version" || command === "-v") {
    output.log(await readPackageVersion());
    return 0;
  }

  if (command === "setup") {
    try {
      const options = parseSetupOptions(args.slice(1));
      await setup(options, output, dependencies);
      return 0;
    } catch (error) {
      output.error(formatError(error));
      return 1;
    }
  }

  output.error(`Unknown command: ${command}`);
  output.error("Run newsmcp --help for usage.");
  return 1;
}

function parseSetupOptions(args: readonly string[]): SetupOptions {
  let client: ClientName | undefined;
  let force = false;
  let noBrowser = false;
  let reauthenticate = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--client") {
      const value = args[index + 1];
      if (value !== "codex" && value !== "claude-code") {
        throw new Error("--client must be codex or claude-code.");
      }
      client = value;
      index += 1;
    } else if (argument === "--force") {
      force = true;
    } else if (argument === "--no-browser") {
      noBrowser = true;
    } else if (argument === "--reauthenticate") {
      reauthenticate = true;
    } else {
      throw new Error(`Unknown setup option: ${argument}`);
    }
  }
  if (client === undefined) {
    throw new Error("setup requires --client <codex|claude-code>.");
  }
  return { client, force, noBrowser, reauthenticate };
}

function formatError(error: unknown): string {
  return error instanceof Error ? `Error: ${error.message}` : "Error: setup failed.";
}
