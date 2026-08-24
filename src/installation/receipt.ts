import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { InstallationReceipt } from "./types.js";

export async function readReceipt(
  stateRoot: string,
): Promise<InstallationReceipt | undefined> {
  const receiptPath = path.join(stateRoot, "installation.json");
  const content = await readFile(receiptPath, "utf8").catch((error: unknown) => {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  });
  if (content === undefined) {
    return undefined;
  }
  const receipt: unknown = JSON.parse(content);
  if (!isInstallationReceipt(receipt)) {
    throw new Error("Unsupported NewsMCP installation receipt.");
  }
  return receipt;
}

export async function writeReceipt(
  stateRoot: string,
  receipt: InstallationReceipt,
): Promise<void> {
  await mkdir(stateRoot, { recursive: true });
  const receiptPath = path.join(stateRoot, "installation.json");
  const temporaryPath = `${receiptPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, receiptPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

function isInstallationReceipt(value: unknown): value is InstallationReceipt {
  if (!isRecord(value)) {
    return false;
  }
  const mcp = value.mcp;
  return (
    value.schemaVersion === 1 &&
    value.manager === "newsmcp-npm" &&
    (value.client === "codex" || value.client === "claude-code") &&
    typeof value.packageVersion === "string" &&
    Array.isArray(value.skills) &&
    value.skills.every(isSkillEntry) &&
    isRecord(mcp) &&
    typeof mcp.name === "string" &&
    typeof mcp.url === "string" &&
    typeof mcp.registrationOwned === "boolean" &&
    typeof mcp.oauthCompleted === "boolean"
  );
}

function isSkillEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.files) &&
    value.files.every(
      (file) =>
        isRecord(file) &&
        typeof file.path === "string" &&
        typeof file.sha256 === "string",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotFound(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
