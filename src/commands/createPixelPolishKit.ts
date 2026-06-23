import * as vscode from "vscode";

import { buildConfigTemplateForProfile, buildKitImplementationPrompt, buildKitReadme, buildPixelPolishKit, nextKitFolderName, resolveWorkspaceConfigPath } from "../core/pixelPolishKitBuilder";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { detectCodeStyle, detectRuntimePresentationModel } from "../core/presentationDetection";
import { ScanCancelledError } from "../core/workspaceScanner";
import { ensureDirectory, ensureProfile, labUri, openTextDocument, pathExists, requireWorkspaceFolder, writeJsonFile, writeTextFile } from "../core/workspace";
import { pixelPolishKitPresets } from "../presets/pixelPolishKitPresets";

export async function createPixelPolishKit(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createPixelPolishKit", folder.uri.fsPath);

  try {
    const profileResult = await ensureProfile(folder);
    const profile = { ...profileResult.profile };
    const detection = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Game Polish Lab: Detecting kit context",
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
    if (JSON.stringify(profile) !== JSON.stringify(profileResult.profile)) {
      await writeJsonFile(profileResult.uri, profile);
      logInfo(`profile updated with detected code style/runtime model: ${profileResult.uri.fsPath}`);
    }

    const picked = await vscode.window.showQuickPick(
      pixelPolishKitPresets.map((preset) => ({
        label: preset.label,
        description: preset.kitId,
        detail: preset.description,
        preset
      })),
      { placeHolder: "Choose a Pixel Polish Kit preset" }
    );
    if (!picked) {
      return;
    }

    const generateConfig = await vscode.window.showQuickPick(
      [
        { label: "Kit files only", value: false, description: "Create files only under .game-polish-lab." },
        { label: "Also create source config", value: true, description: picked.preset.suggestedConfigPath }
      ],
      { placeHolder: "Generate source config template?" }
    );
    if (!generateConfig) {
      return;
    }

    let actualConfigPath = "";
    if (generateConfig.value) {
      const inputPath = await vscode.window.showInputBox({
        title: "Config template path",
        prompt: "Workspace-relative path. The extension will not overwrite without confirmation.",
        value: picked.preset.suggestedConfigPath
      });
      if (!inputPath) {
        return;
      }

      const configUri = resolveWorkspaceConfigPath(folder, inputPath);
      if (!configUri) {
        vscode.window.showErrorMessage("Config path must be a workspace-relative path inside the opened workspace.");
        return;
      }

      if (await pathExists(configUri)) {
        const overwrite = await vscode.window.showWarningMessage(`Config file already exists: ${inputPath}. Overwrite it?`, { modal: true }, "Overwrite");
        if (overwrite !== "Overwrite") {
          return;
        }
      }

      const parent = vscode.Uri.joinPath(configUri, "..");
      await ensureDirectory(parent);
      await writeTextFile(configUri, buildConfigTemplateForProfile(picked.preset, profile));
      actualConfigPath = inputPath;
      logInfo(`source config template created: ${configUri.fsPath}`);
    }

    const kitFolderName = await nextKitFolderName(folder, picked.preset.kitId);
    const kitUri = labUri(folder, "kits", kitFolderName);
    await ensureDirectory(kitUri);

    const kit = buildPixelPolishKit(picked.preset, profile, actualConfigPath);
    const prompt = buildKitImplementationPrompt(kit, profile);
    await writeJsonFile(vscode.Uri.joinPath(kitUri, "kit.json"), kit);
    await writeTextFile(vscode.Uri.joinPath(kitUri, "README.md"), buildKitReadme(kit));
    await writeTextFile(vscode.Uri.joinPath(kitUri, "codex-implementation-prompt.md"), prompt);
    await vscode.env.clipboard.writeText(prompt);

    logInfo(`kit created: ${kitUri.fsPath}`);
    vscode.window.showInformationMessage(`Pixel Polish Kit created: ${kitFolderName}`);
    await openTextDocument(vscode.Uri.joinPath(kitUri, "README.md"));
  } catch (error) {
    if (error instanceof ScanCancelledError) {
      vscode.window.showInformationMessage("Game Polish Lab scan cancelled.");
      logInfo("Pixel Polish Kit detection cancelled by user.");
      return;
    }
    logError("create Pixel Polish Kit failed:", error);
    vscode.window.showErrorMessage(`Failed to create Pixel Polish Kit: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createPixelPolishKit");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
