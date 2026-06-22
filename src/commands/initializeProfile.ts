import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { detectCodeStyle, detectRuntimePresentationModel } from "../core/presentationDetection";
import { ensureProfile, openTextDocument, requireWorkspaceFolder, writeJsonFile } from "../core/workspace";

export async function initializeProfile(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.initializeProfile", folder.uri.fsPath);

  try {
    const result = await ensureProfile(folder);
    const profile = { ...result.profile };
    const codeStyle = await detectCodeStyle(folder);
    const runtimeModel = await detectRuntimePresentationModel(folder);
    if (profile.codeStyle === "unknown" && codeStyle.codeStyle !== "unknown") {
      profile.codeStyle = codeStyle.codeStyle;
    }
    if (profile.runtimePresentationModel === "unknown" && runtimeModel.runtimePresentationModel !== "unknown") {
      profile.runtimePresentationModel = runtimeModel.runtimePresentationModel;
    }
    if (JSON.stringify(profile) !== JSON.stringify(result.profile)) {
      await writeJsonFile(result.uri, profile);
      result.profile = profile;
    }
    const message = result.created
      ? "Game Polish Lab profile created."
      : "Game Polish Lab profile already exists.";
    logInfo(`profile file: ${result.uri.fsPath}`);
    logInfo(`profile created: ${String(result.created)}`);
    vscode.window.showInformationMessage(message);
    await openTextDocument(result.uri);
  } catch (error) {
    logError("initialize profile failed:", error);
    vscode.window.showErrorMessage(`Failed to initialize Game Polish Lab profile: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.initializeProfile");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
