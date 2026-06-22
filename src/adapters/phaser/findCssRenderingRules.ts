import * as vscode from "vscode";

import { findFilesByGlobs, inspectFiles } from "../../core/fileSearch";
import { InspectedFile } from "../../types/audit";

const cssGlobs = [
  "**/*.{css,scss,sass,less}",
  "**/*.{html,htm}"
];

export async function findCssRenderingRuleFiles(folder: vscode.WorkspaceFolder): Promise<InspectedFile[]> {
  const files = await findFilesByGlobs(cssGlobs, 80);
  return inspectFiles(folder, files, 160_000);
}
