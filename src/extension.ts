import * as vscode from "vscode";

import { addFieldNote } from "./commands/addFieldNote";
import { checkCodexScope } from "./commands/checkCodexScope";
import { clearCache } from "./commands/clearCache";
import { createFinishStagePolishPlan } from "./commands/createFinishStagePolishPlan";
import { createPixelPolishKit } from "./commands/createPixelPolishKit";
import { createPolishTask } from "./commands/createPolishTask";
import { createRollbackPrompt } from "./commands/createRollbackPrompt";
import { createRescueTask } from "./commands/createRescueTask";
import { createStyleGuide } from "./commands/createStyleGuide";
import { createTuningExperiment } from "./commands/createTuningExperiment";
import { createTrialReport } from "./commands/createTrialReport";
import { createVisualDiagnosisTask } from "./commands/createVisualDiagnosisTask";
import { generateKitImplementationPrompt } from "./commands/generateKitImplementationPrompt";
import { generateCodexPrompt } from "./commands/generateCodexPrompt";
import { initializeProfile } from "./commands/initializeProfile";
import { listPixelPolishKits } from "./commands/listPixelPolishKits";
import { markLatestTuningResult } from "./commands/markLatestTuningResult";
import { openTrialReports } from "./commands/openTrialReports";
import { runPhaserPixelAudit } from "./commands/runPhaserPixelAudit";
import { setPerformanceMode } from "./commands/setPerformanceMode";
import { showPerformanceDiagnostics } from "./commands/showPerformanceDiagnostics";
import { tuneVisualSurface } from "./commands/tuneVisualSurface";
import { updateTrialResult } from "./commands/updateTrialResult";
import { disposeOutputChannel, getOutputChannel } from "./core/output";
import { clearScanCache } from "./core/workspaceScanner";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(getOutputChannel());
  context.subscriptions.push(
    vscode.commands.registerCommand("gamePolishLab.initializeProfile", initializeProfile),
    vscode.commands.registerCommand("gamePolishLab.runPhaserPixelAudit", runPhaserPixelAudit),
    vscode.commands.registerCommand("gamePolishLab.createPolishTask", createPolishTask),
    vscode.commands.registerCommand("gamePolishLab.createFinishStagePolishPlan", createFinishStagePolishPlan),
    vscode.commands.registerCommand("gamePolishLab.createRescueTask", createRescueTask),
    vscode.commands.registerCommand("gamePolishLab.createPixelPolishKit", createPixelPolishKit),
    vscode.commands.registerCommand("gamePolishLab.listPixelPolishKits", listPixelPolishKits),
    vscode.commands.registerCommand("gamePolishLab.generateKitImplementationPrompt", generateKitImplementationPrompt),
    vscode.commands.registerCommand("gamePolishLab.createStyleGuide", createStyleGuide),
    vscode.commands.registerCommand("gamePolishLab.generateCodexPrompt", generateCodexPrompt),
    vscode.commands.registerCommand("gamePolishLab.createTrialReport", createTrialReport),
    vscode.commands.registerCommand("gamePolishLab.updateTrialResult", updateTrialResult),
    vscode.commands.registerCommand("gamePolishLab.openTrialReports", openTrialReports),
    vscode.commands.registerCommand("gamePolishLab.checkCodexScope", checkCodexScope),
    vscode.commands.registerCommand("gamePolishLab.setPerformanceMode", setPerformanceMode),
    vscode.commands.registerCommand("gamePolishLab.clearCache", clearCache),
    vscode.commands.registerCommand("gamePolishLab.showPerformanceDiagnostics", showPerformanceDiagnostics),
    vscode.commands.registerCommand("gamePolishLab.createVisualDiagnosisTask", createVisualDiagnosisTask),
    vscode.commands.registerCommand("gamePolishLab.createTuningExperiment", createTuningExperiment),
    vscode.commands.registerCommand("gamePolishLab.createRollbackPrompt", createRollbackPrompt),
    vscode.commands.registerCommand("gamePolishLab.tuneVisualSurface", () => tuneVisualSurface(context)),
    vscode.commands.registerCommand("gamePolishLab.markLatestTuningResult", markLatestTuningResult),
    vscode.commands.registerCommand("gamePolishLab.addFieldNote", addFieldNote)
  );
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => clearScanCache()));
}

export function deactivate(): void {
  disposeOutputChannel();
}
