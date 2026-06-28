import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  buildVisualAssetStyleGuide,
  buildVisualAssetStyleGuideFallbackTask,
  findVisualAssetSlotContract,
  generateVisualAssetStyleGuide,
  readLatestVisualAssetStyleGuideSummaries,
  readVisualAssetStyleGuideFile,
  readVisualAssetStyleGuideIndex,
  renderContactSheetRequest,
  visualAssetStyleGuideIndexRelativePath,
  visualAssetStyleGuideRelativeDir,
  writeVisualAssetStyleGuideFallbackTask
} from "../core/visualAssetStyleGuide";
import { buildVisualAssetDashboardRows, visualAssetAssignmentsRelativeDir } from "../core/visualAssetPipeline";
import { writeVisualAssetContractFileSync } from "../core/visualAssetContracts";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import {
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";
import { VisualAssetContractFile, VisualAssetSlotContract } from "../types/visualAssetContract";

const workspace = makeTempWorkspace("v082-asset-style-guide");

try {
  const slot = testSlot();
  const contractSlot = testContractSlot();
  const contractFile: VisualAssetContractFile = {
    schemaVersion: 1,
    generatedBy: "game-polish-lab",
    updatedAt: "2026-06-28T04:00:00.000Z",
    contracts: [{
      contractId: "cursor_arena.asset_replacement",
      projectId: "cursor_arena",
      adapterId: "cursor_arena.assets",
      targetSurfaceType: "asset_replacement",
      targetId: "enemy_icon",
      targetLabel: "Cursor Arena visual assets",
      slots: [contractSlot]
    }]
  };
  writeVisualAssetContractFileSync(workspace, contractFile);
  const foundContract = findVisualAssetSlotContract(contractFile, slot);
  assert.strictEqual(foundContract?.assetSlotId, "enemy_icon");

  const candidate = testCandidate();
  const bounds = testBounds(candidate);
  const normalization = testNormalization(candidate);
  const validation: VisualAssetValidationResult = {
    status: "warning",
    warnings: ["Candidate width differs from expected slot width."],
    errors: [],
    checkedAt: "2026-06-28T04:01:00.000Z"
  };
  writeWorkspaceFile(workspace, normalization.outputPath, "normalized-image-bytes");
  const normalizedBefore = readWorkspaceFile(workspace, normalization.outputPath);

  const guide = buildVisualAssetStyleGuide({
    workspaceRoot: workspace,
    slot,
    candidate,
    validation,
    boundsAnalysis: bounds,
    normalization,
    contract: foundContract,
    userNotes: ["Keep the enemy silhouette chunky and readable."],
    now: date("2026-06-28T04:02:00.000Z")
  });
  assert.strictEqual(guide.adapterId, "cursor_arena");
  assert.strictEqual(guide.surfaceId, "asset_replacement");
  assert.strictEqual(guide.assetSlotId, slot.slotId);
  assert.deepStrictEqual(guide.targetCanvas, { width: 128, height: 128 });
  assert.deepStrictEqual(guide.allowedFileExtensions, [".png", ".webp"]);
  assert.strictEqual(guide.transparencyRequirement, "required");
  assert.strictEqual(guide.safePadding, 8);
  assert.strictEqual(guide.visibleBoundsRules.minVisibleAreaRatio, 0.8);
  assert.strictEqual(guide.visibleBoundsRules.maxVisibleAreaRatio, 0.9);
  assert.strictEqual(guide.centerTolerancePct, 0.05);
  assert.strictEqual(guide.edgeTouchAllowed, false);
  assert.strictEqual(guide.scaleGuidance.upscaleAllowed, false);
  assert.strictEqual(guide.importedAssetPath, candidate.copiedAssetPath);
  assert.strictEqual(guide.normalizedAssetPath, normalization.outputPath);
  assert.ok(guide.validationWarnings.some((warning) => warning.includes("off-center")));
  assert.ok(guide.boundsSummary?.warnings.some((warning) => warning.includes("off-center")));
  assert.ok(guide.styleDirectionNotes.some((note) => note.includes("chunky")));
  assert.ok(guide.readabilityNotes.some((note) => note.includes("small HUD sizes")));
  assert.ok(guide.forbiddenChanges.some((item) => item.includes("save schema")));
  assert.ok(!JSON.stringify(guide).includes("saveStateVersion"));
  assert.ok(!JSON.stringify(guide).includes("economyBalance"));
  assert.ok(!JSON.stringify(guide).includes("adUnitId"));
  assert.ok(!JSON.stringify(guide).includes("enemyHpValue"));
  assert.ok(!JSON.stringify(guide).includes("generatedImageData"));

  const result = generateVisualAssetStyleGuide({
    workspaceRoot: workspace,
    slot,
    candidate,
    validation,
    boundsAnalysis: bounds,
    normalization,
    contract: foundContract,
    userNotes: ["Keep the enemy silhouette chunky and readable."],
    now: date("2026-06-28T04:02:00.000Z")
  });
  assert.strictEqual(result.markdownPath, `${visualAssetStyleGuideRelativeDir}/${guide.guideId}.md`);
  assert.strictEqual(result.jsonPath, `${visualAssetStyleGuideRelativeDir}/${guide.guideId}.json`);
  assert.strictEqual(result.indexPath, visualAssetStyleGuideIndexRelativePath);
  assert.strictEqual(fs.existsSync(path.join(workspace, ...result.markdownPath.split("/"))), true);
  assert.strictEqual(fs.existsSync(path.join(workspace, ...result.jsonPath.split("/"))), true);
  assert.strictEqual(fs.existsSync(path.join(workspace, ...visualAssetStyleGuideIndexRelativePath.split("/"))), true);
  assert.strictEqual(readWorkspaceFile(workspace, normalization.outputPath), normalizedBefore);
  assert.strictEqual(findFiles(workspace, visualAssetStyleGuideRelativeDir, ".png").length, 0);

  const markdown = readWorkspaceFile(workspace, result.markdownPath);
  assert.ok(markdown.includes("# Asset Style Guide: Enemy icon"));
  assert.ok(markdown.includes("## Target Slot"));
  assert.ok(markdown.includes("Canvas: 128x128"));
  assert.ok(markdown.includes("Transparency: required"));
  assert.ok(markdown.includes("80%-90%"));
  assert.ok(markdown.includes("Readability Requirements"));
  assert.ok(markdown.includes("What To Avoid"));
  assert.ok(markdown.includes("Contact-Sheet Request"));
  assert.ok(markdown.includes("Validation Checklist"));
  assert.ok(markdown.includes(normalization.outputPath));
  assert.ok(!markdown.includes("Make it look better"));
  assert.ok(!markdown.includes("make it look better"));

  const savedGuide = readVisualAssetStyleGuideFile(workspace, result.jsonPath)!;
  assert.strictEqual(savedGuide.guideId, guide.guideId);
  assert.strictEqual(savedGuide.outputFiles.includes(result.markdownPath), true);
  const index = readVisualAssetStyleGuideIndex(workspace);
  assert.strictEqual(index.guides.length, 1);
  assert.strictEqual(index.guides[0].markdownPath, result.markdownPath);
  assert.strictEqual(readLatestVisualAssetStyleGuideSummaries(workspace)[0].assetSlotId, slot.slotId);

  const contactRequest = renderContactSheetRequest(savedGuide);
  assert.ok(contactRequest.includes("6 labeled variants"));
  assert.ok(contactRequest.includes("Canvas size: 128x128"));
  assert.ok(contactRequest.includes("Transparent background: required"));
  assert.ok(contactRequest.includes("Safe padding:"));
  assert.ok(contactRequest.includes("Surface context: Cursor Arena / Enemy Presentation / Enemy icon"));
  assert.ok(contactRequest.includes("No text inside icons"));
  assert.ok(contactRequest.includes("Export format: PNG with alpha"));
  assert.ok(contactRequest.includes("variant-{label}.png"));
  assert.ok(!contactRequest.toLowerCase().includes("compare contact sheet"));

  const rows = buildVisualAssetDashboardRows([slot], [candidate], [], "2026-06-28T04:03:00.000Z", [bounds], [normalization], readLatestVisualAssetStyleGuideSummaries(workspace));
  assert.strictEqual(rows[0].styleGuide?.markdownPath, result.markdownPath);
  assert.strictEqual(rows[0].actions.generateStyleGuide, true);
  assert.strictEqual(rows[0].actions.openStyleGuide, true);
  assert.strictEqual(rows[0].actions.copyContactSheetRequest, true);
  assert.strictEqual(rows[0].actions.regenerateStyleGuide, true);
  assert.strictEqual(rows[0].runtimeApplied, false);
  assert.strictEqual(rows[0].assignment, undefined);

  const missingGuide = generateVisualAssetStyleGuide({
    workspaceRoot: workspace,
    slot: { ...slot, slotId: "cursor_arena.unknown_icon", expectedDimensions: undefined },
    now: date("2026-06-28T04:04:00.000Z")
  });
  const missingGuideJson = readVisualAssetStyleGuideFile(workspace, missingGuide.jsonPath)!;
  assert.ok(missingGuideJson.warnings.some((warning) => warning.includes("No asset contract")));
  assert.ok(missingGuideJson.warnings.some((warning) => warning.includes("Target canvas dimensions are unknown")));
  assert.ok(readWorkspaceFile(workspace, missingGuide.markdownPath).includes("manual review required"));

  const fallbackTask = buildVisualAssetStyleGuideFallbackTask({
    slot,
    guide: savedGuide,
    markdownPath: result.markdownPath,
    contactSheetRequestText: contactRequest,
    now: date("2026-06-28T04:05:00.000Z")
  });
  assert.strictEqual(fallbackTask.instruction, "use this style guide to create replacement asset candidates for this selected visual asset slot only.");
  assert.strictEqual(fallbackTask.styleGuidePath, result.markdownPath);
  assert.ok(fallbackTask.allowedFiles.includes(result.markdownPath));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("source/runtime patching")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("economy")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("ad/monetization")));
  const fallbackPath = writeVisualAssetStyleGuideFallbackTask(workspace, fallbackTask);
  assert.ok(fallbackPath.startsWith(".game-polish-lab/fallback-tasks/"));

  const scope = checkVisualScopeGuard({
    operationType: "asset_style_guide_generation",
    adapterId: "cursor_arena",
    surfaceType: "asset_replacement",
    candidatePaths: [
      result.markdownPath,
      result.jsonPath,
      visualAssetStyleGuideIndexRelativePath,
      ".game-polish-lab/assets/asset-contracts.json",
      ".game-polish-lab/assets/bounds-results.json",
      ".game-polish-lab/assets/normalization-results.json",
      ".game-polish-lab/assets/validation-results.json",
      "src/assets/enemies/enemy.png",
      "src/assets/manifest.json",
      "src/loader/AssetLoader.ts",
      "src/systems/saveSystem.ts",
      "src/data/economy.ts",
      "src/arena/data/arenaBalanceConfig.js"
    ]
  });
  assert.strictEqual(scope.recommendedAction, "block");
  assert.ok(scope.classifiedFiles.some((file) => file.path === result.markdownPath && file.classification === "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/assets/enemies/enemy.png" && file.classification !== "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/assets/manifest.json" && file.classification === "suspicious"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/loader/AssetLoader.ts" && file.classification === "suspicious"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/systems/saveSystem.ts" && file.classification === "forbidden"));

  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
    activationEvents: string[];
    contributes: { commands: Array<{ command: string; title: string }> };
  };
  assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.generateAssetStyleGuide"));
  assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.generateAssetStyleGuide" && command.title === "Game Polish Lab: Generate Asset Style Guide"));
} finally {
  cleanupTempWorkspace(workspace);
}

function testSlot(): VisualAssetSlot {
  return {
    slotId: "cursor_arena.enemy_icon",
    adapterId: "cursor_arena",
    adapterLabel: "Cursor Arena",
    surfaceId: "asset_replacement",
    surfaceLabel: "Enemy Presentation",
    slotLabel: "Enemy icon",
    expectedAssetType: "icon",
    expectedFileExtensions: [".png", ".webp"],
    expectedDimensions: { width: 64, height: 64 },
    transparencyRequired: true,
    expectedVisibleBoundsMinRatio: 0.05,
    expectedVisibleBoundsMaxRatio: 0.92,
    safePadding: 4,
    centerTolerancePct: 0.1,
    edgeTouchAllowed: false,
    normalizationAllowed: true,
    scaleDownAllowed: false,
    upscaleAllowed: false,
    currentAssetPath: "src/assets/enemies/enemy.png",
    targetConfigPath: `${visualAssetAssignmentsRelativeDir}/cursor-arena-enemy-icon.json`,
    knownManifestPath: "src/assets/manifest.json",
    ownerSourceFileHints: ["src/arena/scenes/ArenaScene.ts", "src/assets/enemies"],
    safetyStatus: "suspicious",
    validationStatus: "unvalidated",
    directApplyCapability: "fallback_required",
    notes: ["Enemy icon source wiring is fallback-required."]
  };
}

function testContractSlot(): VisualAssetSlotContract {
  return {
    assetSlotId: "enemy_icon",
    label: "Enemy icon",
    expectedWidth: 128,
    expectedHeight: 128,
    expectedFormats: ["PNG", "WebP"],
    transparencyRequirement: "required",
    visibleBoundsRequired: true,
    expectedVisibleBoundsMinRatio: 0.8,
    expectedVisibleBoundsMaxRatio: 0.9,
    safePadding: 8,
    centerTolerancePct: 0.05,
    edgeTouchAllowed: false,
    normalizationAllowed: true,
    scaleDownAllowed: false,
    upscaleAllowed: false,
    loaderHint: "manual_required",
    validation: {
      status: "warning",
      warnings: ["Manual asset path confirmation required."],
      errors: [],
      lastCheckedAt: "2026-06-28T04:00:00.000Z"
    }
  };
}

function testCandidate(): ImportedVisualAssetCandidate {
  return {
    candidateId: "cursor_arena.enemy_icon-2026-06-28T04-00-00-000Z-enemy",
    originalPath: "incoming/enemy.png",
    copiedAssetPath: ".game-polish-lab/assets/imported/enemy.png",
    targetSlotId: "cursor_arena.enemy_icon",
    fileType: "image/png",
    dimensions: { width: 64, height: 64 },
    fileSizeBytes: 128,
    hasAlpha: true,
    validationWarnings: ["Candidate width differs from expected slot width."],
    validationErrors: [],
    approvalStatus: "approved",
    importedAt: "2026-06-28T04:00:00.000Z"
  };
}

function testBounds(candidate: ImportedVisualAssetCandidate): VisualAssetBoundsAnalysisResult {
  return {
    candidateId: candidate.candidateId,
    sourceAssetPath: candidate.copiedAssetPath,
    imageWidth: 64,
    imageHeight: 64,
    visibleBounds: { x: 2, y: 8, width: 44, height: 44 },
    normalizedVisibleBounds: { xPct: 0.0313, yPct: 0.125, widthPct: 0.6875, heightPct: 0.6875 },
    visibleAreaRatio: 0.4727,
    emptyTransparentImage: false,
    touchesCanvasEdge: { left: false, right: false, top: false, bottom: false },
    centerOffset: { x: -8, y: -2, xPct: -0.125, yPct: -0.0313 },
    expectedTargetCanvasWidth: 128,
    expectedTargetCanvasHeight: 128,
    recommendedAction: "normalize",
    warnings: ["Visible content is significantly off-center (-8px, -2px)."],
    errors: [],
    checkedAt: "2026-06-28T04:01:00.000Z"
  };
}

function testNormalization(candidate: ImportedVisualAssetCandidate): VisualAssetNormalizationResult {
  return {
    normalizedAssetId: "cursor_arena.enemy_icon-normalized",
    sourceCandidateId: candidate.candidateId,
    sourcePath: candidate.copiedAssetPath,
    outputPath: ".game-polish-lab/assets/normalized/cursor-arena/enemy.png",
    targetWidth: 128,
    targetHeight: 128,
    paddingApplied: { left: 42, right: 42, top: 42, bottom: 42 },
    scaleApplied: 1,
    contentOffsetApplied: { x: 40, y: 34 },
    originalPreserved: true,
    validationResult: { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T04:02:00.000Z" },
    status: "created",
    warnings: [],
    errors: [],
    createdAt: "2026-06-28T04:02:00.000Z"
  };
}

function writeWorkspaceFile(root: string, relativePath: string, text: string): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, "utf8");
}

function readWorkspaceFile(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8");
}

function findFiles(root: string, relativeDir: string, extension: string): string[] {
  const absoluteDir = path.join(root, ...relativeDir.split("/"));
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  return fs.readdirSync(absoluteDir).filter((entry) => entry.endsWith(extension));
}

function date(value: string): Date {
  return new Date(value);
}

function makeTempWorkspace(name: string): string {
  return fs.mkdtempSync(path.join(process.cwd(), `.tmp-${name}-`));
}

function cleanupTempWorkspace(root: string): void {
  if (root.startsWith(process.cwd())) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
