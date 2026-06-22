import * as vscode from "vscode";

import { checkCodexScope } from "./commands/checkCodexScope";
import { createPolishTask } from "./commands/createPolishTask";
import { generateCodexPrompt } from "./commands/generateCodexPrompt";
import { initializeProfile } from "./commands/initializeProfile";
import { runPhaserPixelAudit } from "./commands/runPhaserPixelAudit";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("gamePolishLab.initializeProfile", initializeProfile),
    vscode.commands.registerCommand("gamePolishLab.runPhaserPixelAudit", runPhaserPixelAudit),
    vscode.commands.registerCommand("gamePolishLab.createPolishTask", createPolishTask),
    vscode.commands.registerCommand("gamePolishLab.generateCodexPrompt", generateCodexPrompt),
    vscode.commands.registerCommand("gamePolishLab.checkCodexScope", checkCodexScope)
  );
}

export function deactivate(): void {
  // No extension-level resources to dispose in v0.1.
}
