import * as path from "path";
import * as vscode from "vscode";

import { defaultProfile, ProjectProfile } from "../types/profile";

export const labFolderName = ".game-polish-lab";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

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
    return { profile: existing, created: false, uri: profileUri };
  }

  await writeJsonFile(profileUri, defaultProfile);
  return { profile: defaultProfile, created: true, uri: profileUri };
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
