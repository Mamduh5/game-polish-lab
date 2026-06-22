import * as vscode from "vscode";

import { checkCodexScope } from "./commands/checkCodexScope";
import { createPixelPolishKit } from "./commands/createPixelPolishKit";
import { createPolishTask } from "./commands/createPolishTask";
import { createRescueTask } from "./commands/createRescueTask";
import { createStyleGuide } from "./commands/createStyleGuide";
import { createTrialReport } from "./commands/createTrialReport";
import { generateKitImplementationPrompt } from "./commands/generateKitImplementationPrompt";
import { generateCodexPrompt } from "./commands/generateCodexPrompt";
import { initializeProfile } from "./commands/initializeProfile";
import { listPixelPolishKits } from "./commands/listPixelPolishKits";
import { openTrialReports } from "./commands/openTrialReports";
import { runPhaserPixelAudit } from "./commands/runPhaserPixelAudit";
import { updateTrialResult } from "./commands/updateTrialResult";
import { disposeOutputChannel, getOutputChannel } from "./core/output";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(getOutputChannel());
  context.subscriptions.push(
    vscode.commands.registerCommand("gamePolishLab.initializeProfile", initializeProfile),
    vscode.commands.registerCommand("gamePolishLab.runPhaserPixelAudit", runPhaserPixelAudit),
    vscode.commands.registerCommand("gamePolishLab.createPolishTask", createPolishTask),
    vscode.commands.registerCommand("gamePolishLab.createRescueTask", createRescueTask),
    vscode.commands.registerCommand("gamePolishLab.createPixelPolishKit", createPixelPolishKit),
    vscode.commands.registerCommand("gamePolishLab.listPixelPolishKits", listPixelPolishKits),
    vscode.commands.registerCommand("gamePolishLab.generateKitImplementationPrompt", generateKitImplementationPrompt),
    vscode.commands.registerCommand("gamePolishLab.createStyleGuide", createStyleGuide),
    vscode.commands.registerCommand("gamePolishLab.generateCodexPrompt", generateCodexPrompt),
    vscode.commands.registerCommand("gamePolishLab.createTrialReport", createTrialReport),
    vscode.commands.registerCommand("gamePolishLab.updateTrialResult", updateTrialResult),
    vscode.commands.registerCommand("gamePolishLab.openTrialReports", openTrialReports),
    vscode.commands.registerCommand("gamePolishLab.checkCodexScope", checkCodexScope)
  );
}

export function deactivate(): void {
  disposeOutputChannel();
}
