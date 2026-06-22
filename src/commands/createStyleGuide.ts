import * as vscode from "vscode";

import { buildStyleGuideMarkdown } from "../core/pixelPolishKitBuilder";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { ensureDirectory, labUri, openTextDocument, pathExists, requireWorkspaceFolder, writeTextFile } from "../core/workspace";

export async function createStyleGuide(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createStyleGuide", folder.uri.fsPath);

  try {
    const styleGuideUri = labUri(folder, "style-guide.md");
    await ensureDirectory(labUri(folder));
    if (await pathExists(styleGuideUri)) {
      const overwrite = await vscode.window.showWarningMessage("Pixel Art Style Guide already exists. Overwrite it?", { modal: true }, "Overwrite");
      if (overwrite !== "Overwrite") {
        await openTextDocument(styleGuideUri);
        return;
      }
    }

    await writeTextFile(styleGuideUri, buildStyleGuideMarkdown());
    logInfo(`style guide created: ${styleGuideUri.fsPath}`);
    vscode.window.showInformationMessage("Pixel Art Style Guide created.");
    await openTextDocument(styleGuideUri);
  } catch (error) {
    logError("create style guide failed:", error);
    vscode.window.showErrorMessage(`Failed to create style guide: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createStyleGuide");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
