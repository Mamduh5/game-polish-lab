import * as vscode from "vscode";

import { scanWorkspace } from "../../core/workspaceScanner";
import { InspectedFile } from "../../types/audit";

export async function findCssRenderingRuleFiles(folder: vscode.WorkspaceFolder): Promise<InspectedFile[]> {
  const scan = await scanWorkspace({ folder, extensions: ["css", "scss", "sass", "less", "html", "htm", "tsx", "jsx"] });
  return findCssRenderingRuleFilesFromFiles(scan.files);
}

export function findCssRenderingRuleFilesFromFiles(files: InspectedFile[]): InspectedFile[] {
  return files.filter((file) => /\.(css|scss|sass|less|html|htm|tsx|jsx)$/i.test(file.relativePath));
}
