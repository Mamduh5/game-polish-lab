import * as path from "path";

export interface ConnectStyleOwnerFileInput {
  text: string;
  ownerPath: string;
  styleModulePath: string;
  importName: string;
  pollFunctionName?: string;
  importFileStem: string;
  requiredProperties: readonly string[];
  patchExpressions: (text: string) => string;
  patchLivePolling?: (text: string) => string;
}

export function connectStyleOwnerFileToStyleModule(input: ConnectStyleOwnerFileInput): string | undefined {
  if (!/\.(ts|tsx)$/.test(input.ownerPath)) {
    return undefined;
  }

  const importPath = relativeImportPath(input.ownerPath, input.styleModulePath);
  const importSpecifiers = input.pollFunctionName ? `${input.importName}, ${input.pollFunctionName}` : input.importName;
  const importLine = `import { ${importSpecifiers} } from '${importPath}';`;
  const lines = input.text.split(/\r?\n/);

  let patched = hasStyleImport(input.text, input.importName, input.importFileStem)
    ? input.text
    : insertImportLine(lines, importLine);
  if (!patched || hasImportInsertedInsideMultilineImport(patched)) {
    return undefined;
  }

  patched = input.patchExpressions(patched);
  if (input.pollFunctionName) {
    patched = ensurePollFunctionImport(patched, input.importName, input.pollFunctionName, input.importFileStem);
  }
  if (input.patchLivePolling) {
    patched = input.patchLivePolling(patched);
  }
  if (
    hasImportInsertedInsideMultilineImport(patched)
    || !hasRequiredRuntimeUsage(patched, input.importName, input.requiredProperties)
    || (input.pollFunctionName ? !new RegExp(`\\b${escapeRegExp(input.pollFunctionName)}\\s*\\(`).test(patched) : false)
  ) {
    return undefined;
  }

  return patched === input.text ? undefined : patched;
}

function hasStyleImport(text: string, importName: string, importFileStem: string): boolean {
  return new RegExp(`import\\s*\\{[^}]*\\b${escapeRegExp(importName)}\\b[^}]*\\}\\s*from\\s*['"][^'"]*${escapeRegExp(importFileStem)}['"]\\s*;`).test(text);
}

function ensurePollFunctionImport(text: string, importName: string, pollFunctionName: string, importFileStem: string): string {
  if (new RegExp(`import\\s*\\{[^}]*\\b${escapeRegExp(pollFunctionName)}\\b[^}]*\\}\\s*from\\s*['"][^'"]*${escapeRegExp(importFileStem)}['"]\\s*;`).test(text)) {
    return text;
  }
  return text.replace(
    new RegExp(`import\\s*\\{([^}]*)\\b${escapeRegExp(importName)}\\b([^}]*)\\}\\s*from\\s*(['"][^'"]*${escapeRegExp(importFileStem)}['"])\\s*;`),
    (_match, before: string, after: string, source: string) => {
      const specifiers = `${before}${importName}${after}`.split(",").map((part) => part.trim()).filter(Boolean);
      return `import { ${Array.from(new Set([...specifiers, pollFunctionName])).join(", ")} } from ${source};`;
    }
  );
}

function insertImportLine(lines: string[], importLine: string): string | undefined {
  const insertAfterLine = findLastCompleteTopLevelImportLine(lines);
  if (insertAfterLine < 0) {
    return undefined;
  }
  const nextLines = [...lines];
  nextLines.splice(insertAfterLine + 1, 0, importLine);
  return nextLines.join("\n");
}

function findLastCompleteTopLevelImportLine(lines: string[]): number {
  let inImportBlock = false;
  let lastCompleteImportLine = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!inImportBlock) {
      if (trimmed.length === 0 || trimmed.startsWith("//")) {
        continue;
      }
      if (!trimmed.startsWith("import ")) {
        continue;
      }
      if (trimmed.endsWith(";")) {
        lastCompleteImportLine = index;
        continue;
      }
      inImportBlock = true;
      continue;
    }
    if (trimmed.endsWith(";")) {
      lastCompleteImportLine = index;
      inImportBlock = false;
    }
  }

  return lastCompleteImportLine;
}

function hasImportInsertedInsideMultilineImport(text: string): boolean {
  const lines = text.split(/\r?\n/);
  let inImportBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inImportBlock) {
      if (trimmed.startsWith("import ") && !trimmed.endsWith(";")) {
        inImportBlock = true;
      }
      continue;
    }
    if (trimmed.startsWith("import ")) {
      return true;
    }
    if (trimmed.endsWith(";")) {
      inImportBlock = false;
    }
  }

  return false;
}

function hasRequiredRuntimeUsage(text: string, identifier: string, requiredProperties: readonly string[]): boolean {
  return requiredProperties.every((property) => new RegExp(`\\b${escapeRegExp(identifier)}\\s*\\.\\s*${property}\\b`).test(text));
}

function relativeImportPath(fromPath: string, toPath: string): string {
  const fromDir = path.posix.dirname(fromPath.replace(/\\/g, "/"));
  const target = toPath.replace(/\\/g, "/").replace(/\.ts$/, "");
  let relativePath = path.posix.relative(fromDir, target);
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
