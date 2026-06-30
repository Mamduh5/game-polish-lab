import * as path from "path";
import * as vscode from "vscode";

import { logInfo } from "./output";
import { defaultProfile, ProjectProfile } from "../types/profile";

export const labFolderName = ".game-polish-lab";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

export type ProductionWorkspaceMode = "real_workspace" | "fixture_test" | "no_workspace";

export interface ProductionWorkspaceContext {
  mode: ProductionWorkspaceMode;
  folder?: vscode.WorkspaceFolder;
  workspaceRoot: string;
  workspaceName: string;
  isFixtureWorkspace: boolean;
  warnings: string[];
}

export function getActiveWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const activeFolder = vscode.workspace.getWorkspaceFolder(activeUri);
    if (activeFolder) {
      return activeFolder;
    }
  }

  return vscode.workspace.workspaceFolders?.[0];
}

export function resolveProductionWorkspaceContext(folder = getActiveWorkspaceFolder()): ProductionWorkspaceContext {
  if (!folder) {
    return {
      mode: "no_workspace",
      workspaceRoot: "",
      workspaceName: "No workspace folder",
      isFixtureWorkspace: false,
      warnings: ["No VS Code workspace folder is open. Game Polish Lab will not use fixture or demo data as a fallback."]
    };
  }
  const workspaceRoot = path.resolve(folder.uri.fsPath);
  const isFixtureWorkspace = /(^|[\\/])fixtures([\\/]|$)/i.test(workspaceRoot);
  return {
    mode: isFixtureWorkspace ? "fixture_test" : "real_workspace",
    folder,
    workspaceRoot,
    workspaceName: folder.name || path.basename(workspaceRoot),
    isFixtureWorkspace,
    warnings: isFixtureWorkspace ? ["Fixture workspace mode is active because the opened workspace path is under fixtures/."] : []
  };
}

export function requireWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folder = getActiveWorkspaceFolder();
  if (!folder) {
    vscode.window.showErrorMessage("Game Polish Lab requires an open workspace folder.");
    return undefined;
  }

  return folder;
}

export function labUri(folder: vscode.WorkspaceFolder, ...segments: string[]): vscode.Uri {
  return vscode.Uri.joinPath(folder.uri, labFolderName, ...segments);
}

export async function ensureDirectory(uri: vscode.Uri): Promise<void> {
  await vscode.workspace.fs.createDirectory(uri);
}

export async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(uri: vscode.Uri): Promise<string> {
  const data = await vscode.workspace.fs.readFile(uri);
  return decoder.decode(data);
}

export async function readTextFileIfExists(uri: vscode.Uri): Promise<string | undefined> {
  if (!(await pathExists(uri))) {
    return undefined;
  }

  return readTextFile(uri);
}

export async function writeTextFile(uri: vscode.Uri, text: string): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, encoder.encode(text));
}

export async function readJsonFileIfExists<T>(uri: vscode.Uri): Promise<T | undefined> {
  const text = await readTextFileIfExists(uri);
  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as T;
}

export async function writeJsonFile(uri: vscode.Uri, value: unknown): Promise<void> {
  await writeTextFile(uri, `${JSON.stringify(value, null, 2)}\n`);
}

export async function ensureProfile(folder: vscode.WorkspaceFolder): Promise<{ profile: ProjectProfile; created: boolean; uri: vscode.Uri }> {
  const profileUri = labUri(folder, "profile.json");
  await ensureDirectory(labUri(folder));

  const existing = await readJsonFileIfExists<ProjectProfile>(profileUri);
  if (existing) {
    const merged = normalizeProfile(existing);
    if (JSON.stringify(merged) !== JSON.stringify(existing)) {
      await writeJsonFile(profileUri, merged);
      logInfo(`profile migrated: ${profileUri.fsPath}`);
    }
    return { profile: merged, created: false, uri: profileUri };
  }

  await writeJsonFile(profileUri, defaultProfile);
  return { profile: defaultProfile, created: true, uri: profileUri };
}

function normalizeProfile(profile: Partial<ProjectProfile>): ProjectProfile {
  const projectType = profile.projectType ?? defaultProfile.projectType;
  return {
    ...defaultProfile,
    ...profile,
    projectType,
    codeStyle: profile.codeStyle ?? defaultProfile.codeStyle,
    runtimePresentationModel: profile.runtimePresentationModel ?? defaultProfile.runtimePresentationModel,
    configFiles: {
      ...defaultProfile.configFiles,
      ...profile.configFiles
    },
    defaultMustNotTouch: profile.defaultMustNotTouch ?? defaultProfile.defaultMustNotTouch,
    codexRequiresApprovalBeforePatch: profile.codexRequiresApprovalBeforePatch ?? true,
    performanceMode: normalizePerformanceMode(profile.performanceMode)
  };
}

function normalizePerformanceMode(value: unknown): ProjectProfile["performanceMode"] {
  return value === "balanced" || value === "deep" || value === "safe" ? value : defaultProfile.performanceMode;
}

export function toWorkspaceRelativePath(folder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
  const relative = path.relative(folder.uri.fsPath, uri.fsPath).replace(/\\/g, "/");
  return relative || path.basename(uri.fsPath);
}

export async function openTextDocument(uri: vscode.Uri): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
}

export function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function isWorkspaceRelativeSafePath(relativePath: string): boolean {
  if (!relativePath || path.isAbsolute(relativePath)) {
    return false;
  }
  const normalized = normalizeWorkspacePath(relativePath);
  return normalized.length > 0 && !normalized.split("/").includes("..");
}

export function workspaceRelativeUri(folder: vscode.WorkspaceFolder, relativePath: string): vscode.Uri | undefined {
  if (!isWorkspaceRelativeSafePath(relativePath)) {
    return undefined;
  }
  return vscode.Uri.joinPath(folder.uri, ...normalizeWorkspacePath(relativePath).split("/"));
}
