import * as vscode from "vscode";

import { scanWorkspaceFiles } from "../../core/fileSearch";
import { InspectedFile } from "../../types/audit";

export async function findCssRenderingRuleFiles(folder: vscode.WorkspaceFolder): Promise<InspectedFile[]> {
  const scan = await scanWorkspaceFiles(folder, {
    extensions: ["css", "scss", "sass", "less", "html", "htm", "tsx", "jsx"],
    maxFiles: 1500,
    maxFileSizeBytes: 512 * 1024
  });
  return scan.files;
}
