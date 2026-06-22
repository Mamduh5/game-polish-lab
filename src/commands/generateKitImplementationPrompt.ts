import * as vscode from "vscode";

import { buildKitImplementationPrompt, readKitFromFolder } from "../core/pixelPolishKitBuilder";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { ensureProfile, labUri, openTextDocument, requireWorkspaceFolder, writeTextFile } from "../core/workspace";

export async function generateKitImplementationPrompt(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.generateKitImplementationPrompt", folder.uri.fsPath);

  try {
    const { profile } = await ensureProfile(folder);
    const picked = await pickKit(folder);
    if (!picked) {
      return;
    }

    const prompt = buildKitImplementationPrompt(picked.kit, profile);
    const promptUri = labUri(folder, "kits", picked.folderName, "codex-implementation-prompt.md");
    await writeTextFile(promptUri, prompt);
    await vscode.env.clipboard.writeText(prompt);
    logInfo(`kit implementation prompt regenerated: ${promptUri.fsPath}`);
    vscode.window.showInformationMessage("Kit implementation prompt generated and copied to clipboard.");
    await openTextDocument(promptUri);
  } catch (error) {
    logError("generate kit implementation prompt failed:", error);
    vscode.window.showErrorMessage(`Failed to generate kit implementation prompt: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.generateKitImplementationPrompt");
  }
}

async function pickKit(folder: vscode.WorkspaceFolder) {
  const kitsFolder = labUri(folder, "kits");
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(kitsFolder);
  } catch {
    vscode.window.showInformationMessage("No Pixel Polish Kits found.");
    return undefined;
  }

  const kits = (await Promise.all(entries
    .filter(([, type]) => type === vscode.FileType.Directory)
    .map(async ([name]) => {
      const kit = await readKitFromFolder(folder, name);
      return kit ? { folderName: name, kit } : undefined;
    }))).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const picked = await vscode.window.showQuickPick(kits.map((entry) => ({
    label: entry.kit.kitLabel,
    description: entry.folderName,
    detail: entry.kit.actualConfigPath || entry.kit.suggestedConfigPath,
    entry
  })), { placeHolder: "Choose a Pixel Polish Kit" });

  return picked?.entry;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
