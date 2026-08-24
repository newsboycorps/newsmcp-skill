import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";

import { PACKAGE_ROOT } from "../package.js";
import type {
  InstallationReceipt,
  InstallSkillsResult,
  SkillManifest,
  SkillManifestEntry,
} from "./types.js";

export async function readBundledManifest(): Promise<SkillManifest> {
  const content = await readFile(
    path.join(PACKAGE_ROOT, "skills-manifest.json"),
    "utf8",
  );
  const manifest = JSON.parse(content) as Partial<SkillManifest>;
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.skills)) {
    throw new Error("Unsupported bundled skill manifest.");
  }
  return manifest as SkillManifest;
}

export async function installBundledSkills(options: {
  skillsRoot: string;
  stateRoot: string;
  manifest: SkillManifest;
  previousReceipt?: InstallationReceipt;
  force: boolean;
}): Promise<InstallSkillsResult> {
  const result: InstallSkillsResult = {
    changed: [],
    unchanged: [],
    backups: [],
  };
  await mkdir(options.skillsRoot, { recursive: true });

  for (const skill of options.manifest.skills) {
    const previous = options.previousReceipt?.skills.find(
      (entry) => entry.name === skill.name,
    );
    const target = path.join(options.skillsRoot, skill.name);
    const current = await hashDirectory(target);
    const desired = fileHashMap(skill);

    if (mapsEqual(current, desired)) {
      result.unchanged.push(skill.name);
      continue;
    }

    if (current.size > 0) {
      const previousHashes = previous === undefined ? undefined : fileHashMap(previous);
      const managedAndUnmodified =
        previousHashes !== undefined && mapsEqual(current, previousHashes);
      if (!managedAndUnmodified && !options.force) {
        throw new Error(
          `${skill.name} already exists or was modified outside NewsMCP. ` +
            "Re-run with --force to preserve a backup and replace it.",
        );
      }
    }

    const backup = await replaceSkill({
      source: path.join(PACKAGE_ROOT, "skills", skill.name),
      target,
      backupRoot: path.join(options.stateRoot, "backups"),
      preserveBackup: current.size > 0 && options.force,
    });
    result.changed.push(skill.name);
    if (backup !== undefined) {
      result.backups.push(backup);
    }
  }
  return result;
}

async function replaceSkill(options: {
  source: string;
  target: string;
  backupRoot: string;
  preserveBackup: boolean;
}): Promise<string | undefined> {
  const suffix = randomUUID();
  const staging = `${options.target}.newsmcp-${suffix}`;
  const temporaryBackup = `${options.target}.newsmcp-backup-${suffix}`;
  let movedExisting = false;

  await cp(options.source, staging, { recursive: true, errorOnExist: true });
  try {
    if (await pathExists(options.target)) {
      await rename(options.target, temporaryBackup);
      movedExisting = true;
    }
    await rename(staging, options.target);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (movedExisting && !(await pathExists(options.target))) {
      await rename(temporaryBackup, options.target);
    }
    throw error;
  }

  if (!movedExisting) {
    return undefined;
  }
  if (!options.preserveBackup) {
    await rm(temporaryBackup, { recursive: true, force: true });
    return undefined;
  }

  await mkdir(options.backupRoot, { recursive: true });
  const backup = path.join(
    options.backupRoot,
    `${path.basename(options.target)}-${suffix}`,
  );
  await rename(temporaryBackup, backup);
  return backup;
}

async function hashDirectory(directory: string): Promise<Map<string, string>> {
  if (!(await pathExists(directory))) {
    return new Map();
  }
  const files = await listFiles(directory);
  return new Map(
    await Promise.all(
      files.map(async (relativePath) => [
        relativePath,
        sha256(await readFile(path.join(directory, relativePath))),
      ] as const),
    ),
  );
}

async function listFiles(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Unsupported installed skill entry: ${relativePath}`);
    }
  }
  return files;
}

function fileHashMap(skill: SkillManifestEntry): Map<string, string> {
  return new Map(skill.files.map((file) => [file.path, file.sha256]));
}

function mapsEqual(
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>,
): boolean {
  return (
    left.size === right.size &&
    [...left].every(([key, value]) => right.get(key) === value)
  );
}

async function pathExists(target: string): Promise<boolean> {
  return await stat(target)
    .then(() => true)
    .catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return false;
      }
      throw error;
    });
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
