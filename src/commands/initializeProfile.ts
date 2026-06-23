import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { detectCodeStyle, detectRuntimePresentationModel } from "../core/presentationDetection";
import { ScanCancelledError } from "../core/workspaceScanner";
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
    const detection = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Game Polish Lab: Detecting project profile",
        cancellable: true
      },
      async (_progress, token) => ({
        codeStyle: await detectCodeStyle(folder, token),
        runtimeModel: await detectRuntimePresentationModel(folder, token)
      })
    );
    const codeStyle = detection.codeStyle;
    const runtimeModel = detection.runtimeModel;
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
    if (error instanceof ScanCancelledError) {
      vscode.window.showInformationMessage("Game Polish Lab scan cancelled.");
      logInfo("profile detection cancelled by user.");
      return;
    }
    logError("initialize profile failed:", error);
    vscode.window.showErrorMessage(`Failed to initialize Game Polish Lab profile: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.initializeProfile");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
