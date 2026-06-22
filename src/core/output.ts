import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  outputChannel ??= vscode.window.createOutputChannel("Game Polish Lab");
  return outputChannel;
}

export function logInfo(message: string): void {
  getOutputChannel().appendLine(`[info] ${timestamp()} ${message}`);
}

export function logWarn(message: string): void {
  getOutputChannel().appendLine(`[warn] ${timestamp()} ${message}`);
}

export function logError(message: string, error?: unknown): void {
  const suffix = error ? ` ${errorToMessage(error)}` : "";
  getOutputChannel().appendLine(`[error] ${timestamp()} ${message}${suffix}`);
}

export function logCommandStart(commandName: string, workspacePath?: string): void {
  logInfo(`command start: ${commandName}`);
  if (workspacePath) {
    logInfo(`workspace: ${workspacePath}`);
  }
}

export function logCommandEnd(commandName: string): void {
  logInfo(`command end: ${commandName}`);
}

export function disposeOutputChannel(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}

function timestamp(): string {
  return new Date().toISOString();
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
