export type VisualRuntimeConnectionStatus =
  | "connected"
  | "not_connected"
  | "import_only"
  | "config_only"
  | "comment_only"
  | "unsupported"
  | "unknown";

export type VisualRuntimeConnectionProofLevel =
  | "runtime_value_usage"
  | "module_import_only"
  | "config_file_exists_only"
  | "comment_marker_only"
  | "none";

export interface VisualRuntimeConnectionProof {
  status: VisualRuntimeConnectionStatus;
  proofLevel: VisualRuntimeConnectionProofLevel;
  connected: boolean;
  styleSource: "style_module" | "json_config" | "runtime_bridge" | "none";
  evidenceFiles: Array<{
    relativePath: string;
    evidenceKind:
      | "imports_style_source"
      | "reads_style_object"
      | "uses_style_property"
      | "spreads_style_values"
      | "passes_style_to_renderer"
      | "polls_live_style"
      | "live_style_path"
      | "comment_marker"
      | "config_exists";
    matchedProperties: string[];
    reason: string;
  }>;
  missingPieces: string[];
  warnings: string[];
}

export interface VisualRuntimeConnectionProofInput {
  files: Array<{ relativePath: string; text: string }>;
  supportedStyleModulePath: string;
  styleIdentifier: string;
  styleProperties: string[];
  styleConfigPath?: string;
  importNameHints: string[];
  commentMarkers: string[];
  usageDescription: string;
  liveOverlay?: {
    pollFunctionName: string;
    liveStylePath: string;
  };
}

export function runtimeProofAllowsDirectApply(proof: VisualRuntimeConnectionProof | undefined): boolean {
  return Boolean(proof
    && proof.connected === true
    && proof.status === "connected"
    && proof.proofLevel === "runtime_value_usage");
}

export function analyzeVisualRuntimeConnectionProof(input: VisualRuntimeConnectionProofInput): VisualRuntimeConnectionProof {
  const propertySet = new Set(input.styleProperties);
  const evidenceFiles: VisualRuntimeConnectionProof["evidenceFiles"] = [];
  const ownerFiles = input.files.filter((file) => file.relativePath !== input.supportedStyleModulePath);
  const styleModuleExists = input.files.some((file) => file.relativePath === input.supportedStyleModulePath);

  if (styleModuleExists) {
    const styleModule = input.files.find((file) => file.relativePath === input.supportedStyleModulePath);
    evidenceFiles.push({
      relativePath: input.supportedStyleModulePath,
      evidenceKind: "config_exists",
      matchedProperties: [],
      reason: `${input.supportedStyleModulePath} exists, but file existence alone is not runtime usage.`
    });
    if (input.liveOverlay && styleModule?.text.includes(input.liveOverlay.liveStylePath) && new RegExp(`\\b${escapeRegExp(input.liveOverlay.pollFunctionName)}\\s*\\(`).test(styleModule.text)) {
      evidenceFiles.push({
        relativePath: input.supportedStyleModulePath,
        evidenceKind: "live_style_path",
        matchedProperties: [],
        reason: `${input.supportedStyleModulePath} declares ${input.liveOverlay.liveStylePath} and ${input.liveOverlay.pollFunctionName}.`
      });
    }
  }

  for (const file of ownerFiles) {
    const comments = extractComments(file.text);
    const commentHits = input.commentMarkers.filter((marker) => comments.toLowerCase().includes(marker.toLowerCase()));
    if (commentHits.length > 0) {
      evidenceFiles.push({
        relativePath: file.relativePath,
        evidenceKind: "comment_marker",
        matchedProperties: [],
        reason: `${file.relativePath} contains a bridge/comment marker only.`
      });
    }

    const codeWithoutComments = stripComments(file.text);
    if (importsStyleSource(codeWithoutComments, input)) {
      evidenceFiles.push({
        relativePath: file.relativePath,
        evidenceKind: "imports_style_source",
        matchedProperties: [],
        reason: `${file.relativePath} imports or references the generated style source.`
      });
    }

    const code = stripCommentsAndStrings(file.text);
    const propertyMatches = findDirectPropertyMatches(code, input.styleIdentifier, propertySet);
    const destructuredMatches = findUsedDestructuredProperties(code, input.styleIdentifier, propertySet);
    const matchedProperties = Array.from(new Set([...propertyMatches, ...destructuredMatches])).sort();
    if (matchedProperties.length > 0) {
      evidenceFiles.push({
        relativePath: file.relativePath,
        evidenceKind: propertyMatches.length > 0 ? "uses_style_property" : "reads_style_object",
        matchedProperties,
        reason: `${file.relativePath} uses generated style properties in code: ${matchedProperties.join(", ")}.`
      });
    }

    if (input.liveOverlay && new RegExp(`\\b${escapeRegExp(input.liveOverlay.pollFunctionName)}\\s*\\(`).test(code)) {
      evidenceFiles.push({
        relativePath: file.relativePath,
        evidenceKind: "polls_live_style",
        matchedProperties: [],
        reason: `${file.relativePath} polls ${input.liveOverlay.liveStylePath} through ${input.liveOverlay.pollFunctionName}.`
      });
    }
  }

  const runtimeEvidence = evidenceFiles.filter((entry) => entry.evidenceKind === "uses_style_property" || entry.evidenceKind === "reads_style_object");
  const livePollEvidence = evidenceFiles.filter((entry) => entry.evidenceKind === "polls_live_style");
  const liveModuleEvidence = evidenceFiles.filter((entry) => entry.evidenceKind === "live_style_path");
  const importEvidence = evidenceFiles.some((entry) => entry.evidenceKind === "imports_style_source");
  const commentEvidence = evidenceFiles.some((entry) => entry.evidenceKind === "comment_marker");
  const configEvidence = evidenceFiles.some((entry) => entry.evidenceKind === "config_exists");
  const styleSource = runtimeEvidence.length > 0 || importEvidence ? "style_module"
    : configEvidence ? "json_config"
    : commentEvidence ? "runtime_bridge"
    : "none";
  const missingPieces: string[] = [];
  const warnings: string[] = [];

  if (runtimeEvidence.length === 0) {
    missingPieces.push(`${input.usageDescription} must read generated style values such as ${input.styleIdentifier}.${input.styleProperties.slice(0, 4).join(`, ${input.styleIdentifier}.`)}.`);
  }
  if (!styleModuleExists) {
    missingPieces.push(`${input.supportedStyleModulePath} has not been generated yet.`);
  }
  if (input.liveOverlay && liveModuleEvidence.length === 0) {
    missingPieces.push(`${input.supportedStyleModulePath} must expose dev-only live overlay loading for ${input.liveOverlay.liveStylePath}.`);
  }
  if (input.liveOverlay && livePollEvidence.length === 0) {
    missingPieces.push(`${input.usageDescription} must poll ${input.liveOverlay.liveStylePath} through ${input.liveOverlay.pollFunctionName}.`);
  }
  if (input.liveOverlay && runtimeEvidence.length > 0 && (liveModuleEvidence.length === 0 || livePollEvidence.length === 0)) {
    warnings.push("Runtime style values are used, but dev live-overlay polling is not fully connected.");
  }
  if (importEvidence && runtimeEvidence.length === 0) {
    warnings.push("Import-only evidence is not direct-apply connection proof.");
  }
  if (commentEvidence && runtimeEvidence.length === 0) {
    warnings.push("Comment or bridge marker evidence is not direct-apply connection proof.");
  }
  if (configEvidence && runtimeEvidence.length === 0) {
    warnings.push("Generated style module/config existence is not direct-apply connection proof.");
  }

  const liveOverlaySatisfied = !input.liveOverlay || (liveModuleEvidence.length > 0 && livePollEvidence.length > 0);
  const status: VisualRuntimeConnectionStatus = runtimeEvidence.length > 0 && liveOverlaySatisfied ? "connected"
    : importEvidence ? "import_only"
    : commentEvidence ? "comment_only"
    : configEvidence ? "config_only"
    : "not_connected";
  const proofLevel: VisualRuntimeConnectionProofLevel = status === "connected" ? "runtime_value_usage"
    : status === "import_only" ? "module_import_only"
    : status === "comment_only" ? "comment_marker_only"
    : status === "config_only" ? "config_file_exists_only"
    : "none";

  return {
    status,
    proofLevel,
    connected: status === "connected" && proofLevel === "runtime_value_usage",
    styleSource,
    evidenceFiles,
    missingPieces,
    warnings
  };
}

function importsStyleSource(codeWithoutComments: string, input: VisualRuntimeConnectionProofInput): boolean {
  const normalized = codeWithoutComments.toLowerCase();
  const styleImportPath = input.supportedStyleModulePath.replace(/^src\//, "../").replace(/\.ts$/, "").toLowerCase();
  if (normalized.includes(styleImportPath)) {
    return true;
  }
  return input.importNameHints.some((hint) => new RegExp(`\\b${escapeRegExp(hint)}\\b`, "i").test(codeWithoutComments));
}

function findDirectPropertyMatches(code: string, identifier: string, propertySet: Set<string>): string[] {
  const matches = new Set<string>();
  const propertyPattern = Array.from(propertySet).map(escapeRegExp).join("|");
  const regex = new RegExp(`\\b${escapeRegExp(identifier)}\\s*\\.\\s*(${propertyPattern})\\b`, "g");
  for (const match of code.matchAll(regex)) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

function findUsedDestructuredProperties(code: string, identifier: string, propertySet: Set<string>): string[] {
  const matches = new Set<string>();
  const destructureRegex = new RegExp(`\\b(?:const|let|var)\\s*\\{([^}]+)\\}\\s*=\\s*${escapeRegExp(identifier)}\\s*;?`, "g");
  for (const match of code.matchAll(destructureRegex)) {
    const declaration = match[0];
    const body = match[1];
    const afterDeclaration = code.slice((match.index ?? 0) + declaration.length);
    for (const rawPart of body.split(",")) {
      const part = rawPart.trim();
      if (!part) {
        continue;
      }
      const [propertyNameRaw, localNameRaw] = part.split(":").map((value) => value.trim());
      const propertyName = propertyNameRaw.replace(/[^\w$]/g, "");
      const localName = (localNameRaw ?? propertyNameRaw).replace(/[^\w$]/g, "");
      if (!propertySet.has(propertyName) || !localName) {
        continue;
      }
      if (new RegExp(`\\b${escapeRegExp(localName)}\\b`).test(afterDeclaration)) {
        matches.add(propertyName);
      }
    }
  }
  return Array.from(matches);
}

function stripCommentsAndStrings(text: string): string {
  let result = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      result += "  ";
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        result += text[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      result += "  ";
      index += 2;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      const quote = char;
      result += " ";
      index += 1;
      while (index < text.length) {
        const current = text[index];
        result += current === "\n" ? "\n" : " ";
        if (current === "\\") {
          index += 2;
          result += " ";
          continue;
        }
        index += 1;
        if (current === quote) {
          break;
        }
      }
      continue;
    }
    result += char;
    index += 1;
  }
  return result;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (match) => " ".repeat(match.length));
}

function extractComments(text: string): string {
  return [
    ...Array.from(text.matchAll(/\/\*([\s\S]*?)\*\//g)).map((match) => match[1]),
    ...Array.from(text.matchAll(/\/\/([^\n\r]*)/g)).map((match) => match[1])
  ].join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
