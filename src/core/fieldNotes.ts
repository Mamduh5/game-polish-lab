import * as vscode from "vscode";

import { ensureDirectory, labUri, readTextFileIfExists, writeTextFile } from "./workspace";

export async function readFieldNotes(folder: vscode.WorkspaceFolder): Promise<string[]> {
  const text = await readTextFileIfExists(labUri(folder, "field-notes.md"));
  if (!text) {
    return [];
  }

  return text.split(/\r?\n/)
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

export async function appendFieldNote(folder: vscode.WorkspaceFolder, note: string): Promise<vscode.Uri> {
  await ensureDirectory(labUri(folder));
  const uri = labUri(folder, "field-notes.md");
  const existing = await readTextFileIfExists(uri);
  const line = `- ${new Date().toISOString()}: ${note.trim()}`;
  await writeTextFile(uri, existing ? `${existing.trimEnd()}\n${line}\n` : `# Game Polish Lab Field Notes\n\n${line}\n`);
  return uri;
}

export function renderFieldNotesSection(notes: string[]): string {
  return notes.length > 0
    ? `## Field Notes\n\n${notes.map((note) => `- ${note}`).join("\n")}\n`
    : "";
}
