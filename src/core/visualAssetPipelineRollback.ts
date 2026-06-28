import * as fs from "fs";
import * as path from "path";

import { normalizeVisualScopePath } from "./visualScopeGuard";

export function createGamePolishLabRollbackSnapshot(input: {
  workspaceRoot: string;
  relativePath: string;
  now?: Date;
  label: string;
}): string | undefined {
  const normalized = normalizeVisualScopePath(input.relativePath);
  if (!isRollbackSupportedGamePolishLabPath(normalized)) {
    throw new Error(`Rollback snapshot only supports Game Polish Lab-owned files: ${input.relativePath}`);
  }
  const sourcePath = resolveWorkspacePath(input.workspaceRoot, normalized);
  if (!fs.existsSync(sourcePath)) {
    return undefined;
  }
  const now = input.now ?? new Date();
  const rollbackRelativePath = `.game-polish-lab/rollback/${timestampForPath(now)}-${safeId(input.label)}-${path.basename(normalized)}`;
  const rollbackPath = resolveWorkspacePath(input.workspaceRoot, rollbackRelativePath);
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.copyFileSync(sourcePath, rollbackPath);
  return rollbackRelativePath;
}

export function writeGamePolishLabOwnedFileWithRollback(input: {
  workspaceRoot: string;
  relativePath: string;
  data: string | Uint8Array;
  now?: Date;
  label: string;
  encoding?: BufferEncoding;
}): string | undefined {
  const rollbackSnapshotPath = createGamePolishLabRollbackSnapshot({
    workspaceRoot: input.workspaceRoot,
    relativePath: input.relativePath,
    now: input.now,
    label: input.label
  });
  const normalized = normalizeVisualScopePath(input.relativePath);
  const absolutePath = resolveWorkspacePath(input.workspaceRoot, normalized);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  if (typeof input.data === "string") {
    fs.writeFileSync(absolutePath, input.data, input.encoding ?? "utf8");
  } else {
    fs.writeFileSync(absolutePath, input.data);
  }
  return rollbackSnapshotPath;
}

export function isRollbackSupportedGamePolishLabPath(relativePath: string): boolean {
  const normalized = normalizeVisualScopePath(relativePath);
  return normalized.startsWith(".game-polish-lab/")
    && !normalized.startsWith(".game-polish-lab/rollback/")
    && !normalized.endsWith("/");
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  const normalized = normalizeVisualScopePath(relativePath);
  if (!normalized || path.isAbsolute(relativePath) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Unsafe workspace path: ${relativePath}`);
  }
  const absolutePath = path.resolve(workspaceRoot, ...normalized.split("/"));
  const root = path.resolve(workspaceRoot);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Workspace path escapes root: ${relativePath}`);
  }
  return absolutePath;
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function safeId(value: string): string {
  return normalizeVisualScopePath(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}
