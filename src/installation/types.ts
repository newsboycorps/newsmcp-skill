import type { ClientName } from "../constants.js";

export interface SkillManifestFile {
  path: string;
  sha256: string;
}

export interface SkillManifestEntry {
  name: string;
  files: SkillManifestFile[];
}

export interface SkillManifest {
  schemaVersion: 1;
  packageVersion: string;
  skills: SkillManifestEntry[];
}

export interface InstallationReceipt {
  schemaVersion: 1;
  manager: "newsmcp-npm";
  client: ClientName;
  packageVersion: string;
  skills: SkillManifestEntry[];
  mcp: {
    name: string;
    url: string;
    registrationOwned: boolean;
    oauthCompleted: boolean;
  };
}

export interface InstallSkillsResult {
  changed: string[];
  unchanged: string[];
  backups: string[];
}
