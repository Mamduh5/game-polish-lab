import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { labUri, openTextDocument, pathExists, requireWorkspaceFolder } from "../core/workspace";
import { readKitFromFolder } from "../core/pixelPolishKitBuilder";

export async function listPixelPolishKits(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.listPixelPolishKits", folder.uri.fsPath);

  try {
    const kitsFolder = labUri(folder, "kits");
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(kitsFolder);
    } catch {
      vscode.window.showInformationMessage("No Pixel Polish Kits found.");
      return;
    }

    const kits = (await Promise.all(entries
      .filter(([, type]) => type === vscode.FileType.Directory)
      .map(async ([name]) => {
        const kit = await readKitFromFolder(folder, name);
        return kit ? { folderName: name, kit } : undefined;
      }))).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (kits.length === 0) {
      vscode.window.showInformationMessage("No Pixel Polish Kits found.");
      return;
    }

    const picked = await vscode.window.showQuickPick(kits.map((entry) => ({
      label: entry.kit.kitLabel,
      description: `${entry.folderName} | ${entry.kit.kitId}`,
      detail: `${entry.kit.createdAt}${entry.kit.actualConfigPath ? ` | ${entry.kit.actualConfigPath}` : ""}`,
      entry
    })), { placeHolder: "Choose a Pixel Polish Kit" });
    if (!picked) {
      return;
    }

    const readmeUri = labUri(folder, "kits", picked.entry.folderName, "README.md");
    await openTextDocument(await pathExists(readmeUri) ? readmeUri : labUri(folder, "kits", picked.entry.folderName, "kit.json"));
  } catch (error) {
    logError("list Pixel Polish Kits failed:", error);
    vscode.window.showErrorMessage(`Failed to list Pixel Polish Kits: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.listPixelPolishKits");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
