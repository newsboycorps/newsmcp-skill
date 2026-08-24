import type { ClientName } from "../constants.js";
import { MCP_URL } from "../constants.js";
import { createClientAdapter } from "../clients/index.js";
import { installBundledSkills, readBundledManifest } from "../installation/installer.js";
import { readReceipt, writeReceipt } from "../installation/receipt.js";
import type { InstallationReceipt } from "../installation/types.js";
import { readPackageVersion } from "../package.js";
import { resolveClientPaths } from "../system/paths.js";
import { NodeProcessRunner, type ProcessRunner } from "../system/process-runner.js";

export interface SetupOptions {
  client: ClientName;
  force: boolean;
  noBrowser: boolean;
  reauthenticate: boolean;
}

export interface SetupOutput {
  log(message: string): void;
}

export interface SetupDependencies {
  env?: NodeJS.ProcessEnv;
  runner?: ProcessRunner;
}

export async function setup(
  options: SetupOptions,
  output: SetupOutput,
  dependencies: SetupDependencies = {},
): Promise<void> {
  const runner = dependencies.runner ?? new NodeProcessRunner();
  const paths = resolveClientPaths(options.client, dependencies.env);
  const adapter = createClientAdapter(options.client);
  const manifest = await readBundledManifest();
  const packageVersion = await readPackageVersion();
  if (manifest.packageVersion !== packageVersion) {
    throw new Error("Bundled skill manifest does not match the package version.");
  }

  output.log(`Checking ${displayClient(options.client)}...`);
  const initialInspection = await adapter.inspect(runner).catch((error: unknown) => {
    if (isExecutableMissing(error)) {
      throw new Error(`${adapter.executable} is not installed or not available in PATH.`);
    }
    throw error;
  });
  if (initialInspection.state === "conflict") {
    throw new Error(initialInspection.detail ?? "Conflicting MCP registration found.");
  }

  const previousReceipt = await readReceipt(paths.stateRoot);
  const skillResult = await installBundledSkills({
    skillsRoot: paths.skillsRoot,
    stateRoot: paths.stateRoot,
    manifest,
    ...(previousReceipt === undefined ? {} : { previousReceipt }),
    force: options.force,
  });
  output.log(formatSkillResult(skillResult.changed.length, skillResult.unchanged.length));
  if (skillResult.backups.length > 0) {
    output.log(`${skillResult.backups.length} previous skill installation backed up.`);
  }

  let receipt: InstallationReceipt = {
    schemaVersion: 1,
    manager: "newsmcp-npm",
    client: options.client,
    packageVersion,
    skills: manifest.skills,
    mcp: {
      name: initialInspection.name,
      url: MCP_URL,
      registrationOwned:
        previousReceipt?.mcp.registrationOwned === true &&
        previousReceipt.mcp.url === MCP_URL,
      oauthCompleted:
        initialInspection.authenticated === true ||
        (initialInspection.authenticated === undefined &&
          previousReceipt?.mcp.oauthCompleted === true),
    },
  };
  await writeReceipt(paths.stateRoot, receipt);

  let inspection = initialInspection;
  if (inspection.state === "absent") {
    await adapter.register(runner);
    inspection = await adapter.inspect(runner);
    if (inspection.state !== "matching") {
      throw new Error("NewsMCP registration could not be verified after setup.");
    }
    receipt = {
      ...receipt,
      mcp: {
        ...receipt.mcp,
        name: inspection.name,
        registrationOwned: true,
      },
    };
    await writeReceipt(paths.stateRoot, receipt);
    output.log("MCP endpoint registered.");
  } else {
    output.log(`MCP endpoint already registered as ${inspection.name}.`);
  }

  const shouldLogin =
    options.reauthenticate ||
    inspection.authenticated === false ||
    receipt.mcp.oauthCompleted !== true;
  if (shouldLogin) {
    output.log(
      "Starting native OAuth login. NewsMCP installer does not read or store OAuth tokens.",
    );
    await adapter.login(runner, {
      name: inspection.name,
      noBrowser: options.noBrowser,
    });
    receipt = {
      ...receipt,
      mcp: { ...receipt.mcp, oauthCompleted: true },
    };
    await writeReceipt(paths.stateRoot, receipt);
    output.log("OAuth login completed.");
  } else {
    output.log("OAuth login already completed.");
  }

  output.log(`NewsMCP ${packageVersion} setup is complete.`);
}

function displayClient(client: ClientName): string {
  return client === "codex" ? "Codex" : "Claude Code";
}

function formatSkillResult(changed: number, unchanged: number): string {
  if (changed === 0) {
    return `${unchanged} NewsMCP skill installation already up to date.`;
  }
  return `${changed} NewsMCP skill installation updated; ${unchanged} unchanged.`;
}

function isExecutableMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
