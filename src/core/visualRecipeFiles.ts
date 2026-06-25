import * as vscode from "vscode";

import { VisualSurfaceRecipe } from "../types/visualRecipe";
import { ensureDirectory, labUri, pathExists, readTextFileIfExists, writeJsonFile } from "./workspace";
import { getVisualSurfaceRecipes, validateVisualSurfaceRecipe, visualRecipeRelativePath } from "./visualRecipeRegistry";

export interface VisualRecipeFileWriteResult {
  recipeId: string;
  relativePath: string;
  written: boolean;
  warnings: string[];
  errors: string[];
}

export async function ensureVisualRecipeFiles(folder: vscode.WorkspaceFolder, recipes = getVisualSurfaceRecipes()): Promise<VisualRecipeFileWriteResult[]> {
  await ensureDirectory(labUri(folder, "visual-recipes"));
  const results: VisualRecipeFileWriteResult[] = [];
  for (const recipe of recipes) {
    const validation = validateVisualSurfaceRecipe(recipe);
    const relativePath = visualRecipeRelativePath(recipe.recipeId);
    const uri = labUri(folder, "visual-recipes", `${recipe.recipeId}.json`);
    const existingText = await readTextFileIfExists(uri);
    const expectedText = `${JSON.stringify(recipe, null, 2)}\n`;
    if (validation.ok && existingText !== expectedText) {
      await writeJsonFile(uri, recipe);
    }
    results.push({
      recipeId: recipe.recipeId,
      relativePath,
      written: validation.ok && existingText !== expectedText,
      warnings: validation.warnings,
      errors: validation.errors
    });
  }
  return results;
}

export async function loadVisualRecipeFile(folder: vscode.WorkspaceFolder, recipeId: string): Promise<{ recipe?: VisualSurfaceRecipe; warning?: string }> {
  const uri = labUri(folder, "visual-recipes", `${recipeId}.json`);
  if (!(await pathExists(uri))) {
    return { warning: `${visualRecipeRelativePath(recipeId)} does not exist.` };
  }
  const text = await readTextFileIfExists(uri);
  if (text === undefined) {
    return { warning: `${visualRecipeRelativePath(recipeId)} could not be read.` };
  }
  try {
    const parsed = JSON.parse(text) as VisualSurfaceRecipe;
    const validation = validateVisualSurfaceRecipe(parsed);
    return validation.ok ? { recipe: parsed } : { warning: validation.errors.join(" ") };
  } catch {
    return { warning: `${visualRecipeRelativePath(recipeId)} is invalid JSON.` };
  }
}
