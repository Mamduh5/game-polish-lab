import * as vscode from "vscode";

import { applyIdleMonsterFarmFarmSlotStyle, detectIdleMonsterFarmFarmSlotAdapter, summarizeFarmSlotApplyResult } from "../adapters/idleMonsterFarm/farmSlotAdapter";
import { checkV05VisualScope } from "../core/v05VisualScopeGuard";
import { logCommandEnd, logCommandStart, logError, logInfo, logWarn } from "../core/output";
import { ensureDirectory, labUri, pathExists, readJsonFileIfExists, readTextFile, requireWorkspaceFolder, writeJsonFile, writeTextFile } from "../core/workspace";
import { defaultSlotCardStyle, slotCardPresets, slotCardStyleBounds } from "../presets/slotCardPresets";
import { SlotCardStyleConfig, SlotCardStyleValues } from "../types/visualSurface";

interface SaveMessage {
  command: "saveAndApply";
  presetName: string;
  values: SlotCardStyleValues;
}

interface SaveResultMessage {
  command: "saveResult";
  ok: boolean;
  configPath?: string;
  rollbackPath?: string;
  checklist?: string[];
  applySummary?: string[];
  warnings?: string[];
  error?: string;
}

const styleConfigRelativePath = ".game-polish-lab/styles/farm-slot-style.json";

export async function tuneVisualSurface(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.tuneVisualSurface", folder.uri.fsPath);

  try {
    const existingConfig = await readJsonFileIfExists<SlotCardStyleConfig>(labUri(folder, "styles", "farm-slot-style.json"));
    const adapterDetection = await detectIdleMonsterFarmFarmSlotAdapter(folder);
    const panel = vscode.window.createWebviewPanel(
      "gamePolishLab.tuneVisualSurface",
      "Tune Visual Surface",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri, folder.uri]
      }
    );

    panel.webview.html = renderTuneVisualSurfaceHtml(panel.webview, {
      initialConfig: normalizeConfig(existingConfig),
      adapterLikelyFiles: adapterDetection.likelyFiles,
      adapterWarnings: adapterDetection.warnings
    });

    panel.webview.onDidReceiveMessage(async (message: SaveMessage) => {
      if (message.command !== "saveAndApply") {
        return;
      }
      const result = await saveAndApply(folder, message);
      await panel.webview.postMessage(result);
    });
  } catch (error) {
    logError("tune visual surface failed:", error);
    vscode.window.showErrorMessage(`Failed to open visual surface tuner: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.tuneVisualSurface");
  }
}

async function saveAndApply(folder: vscode.WorkspaceFolder, message: SaveMessage): Promise<SaveResultMessage> {
  try {
    const config = buildConfig(message.presetName, message.values);
    const configUri = labUri(folder, "styles", "farm-slot-style.json");
    const plannedConfigFiles = [styleConfigRelativePath];
    const scope = checkV05VisualScope(plannedConfigFiles, { throughAdapter: false });
    if (!scope.ok) {
      const error = `v0.5 scope guard blocked config save: ${scope.forbiddenFiles.join(", ")}`;
      logWarn(error);
      return { command: "saveResult", ok: false, error, warnings: scope.warnings };
    }

    await ensureDirectory(labUri(folder, "styles"));
    const rollbackPath = await createRollbackSnapshotIfNeeded(folder, configUri);
    await writeJsonFile(configUri, config);

    const applyResult = await applyIdleMonsterFarmFarmSlotStyle(folder, config);
    const applySummary = summarizeFarmSlotApplyResult(folder, applyResult);
    for (const line of applySummary) {
      logInfo(line);
    }
    for (const warning of applyResult.warnings) {
      logWarn(warning);
    }

    const checklist = buildManualChecklist(Boolean(rollbackPath), applyResult.changedFiles);
    logChecklist(checklist);
    vscode.window.showInformationMessage(applyResult.applied
      ? "Game Polish Lab style saved and applied through the farm slot adapter."
      : "Game Polish Lab style saved. Direct apply was blocked or unsafe; see Game Polish Lab output.");

    return {
      command: "saveResult",
      ok: true,
      configPath: styleConfigRelativePath,
      rollbackPath,
      checklist,
      applySummary,
      warnings: applyResult.warnings
    };
  } catch (error) {
    logError("save/apply visual surface failed:", error);
    return {
      command: "saveResult",
      ok: false,
      error: errorToMessage(error)
    };
  }
}

async function createRollbackSnapshotIfNeeded(folder: vscode.WorkspaceFolder, configUri: vscode.Uri): Promise<string | undefined> {
  if (!(await pathExists(configUri))) {
    return undefined;
  }

  const existingText = await readTextFile(configUri);
  await ensureDirectory(labUri(folder, "rollback"));
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-farm-slot-style.json`;
  const rollbackUri = labUri(folder, "rollback", fileName);
  await writeTextFile(rollbackUri, existingText);
  return `.game-polish-lab/rollback/${fileName}`;
}

function normalizeConfig(config: SlotCardStyleConfig | undefined): SlotCardStyleConfig {
  if (!config || config.schemaVersion !== 1 || config.surfaceType !== "slot_card" || config.adapterTarget !== "idle_monster_farm.farm_slots") {
    return buildConfig(slotCardPresets[0].name, slotCardPresets[0].values);
  }
  return {
    ...config,
    values: normalizeValues(config.values)
  };
}

function buildConfig(presetName: string, values: SlotCardStyleValues): SlotCardStyleConfig {
  return {
    schemaVersion: 1,
    surfaceType: "slot_card",
    adapterTarget: "idle_monster_farm.farm_slots",
    presetName,
    updatedAt: new Date().toISOString(),
    values: normalizeValues(values)
  };
}

function normalizeValues(values: SlotCardStyleValues): SlotCardStyleValues {
  return {
    slotWidth: clampNumber(values.slotWidth, "slotWidth"),
    slotHeight: clampNumber(values.slotHeight, "slotHeight"),
    gap: clampNumber(values.gap, "gap"),
    borderWidth: clampNumber(values.borderWidth, "borderWidth"),
    cornerRadius: clampNumber(values.cornerRadius, "cornerRadius"),
    fillColor: normalizeColor(values.fillColor, defaultSlotCardStyle.fillColor),
    borderColor: normalizeColor(values.borderColor, defaultSlotCardStyle.borderColor),
    selectedGlowStrength: clampNumber(values.selectedGlowStrength, "selectedGlowStrength"),
    lockedOverlayOpacity: clampNumber(values.lockedOverlayOpacity, "lockedOverlayOpacity"),
    emptySlotOpacity: clampNumber(values.emptySlotOpacity, "emptySlotOpacity"),
    mergeCandidatePulseScale: clampNumber(values.mergeCandidatePulseScale, "mergeCandidatePulseScale"),
    monsterDisplayScale: clampNumber(values.monsterDisplayScale, "monsterDisplayScale"),
    monsterVerticalOffset: clampNumber(values.monsterVerticalOffset, "monsterVerticalOffset")
  };
}

function clampNumber(value: number, key: keyof typeof slotCardStyleBounds): number {
  const bounds = slotCardStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultSlotCardStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function normalizeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function buildManualChecklist(rollbackCreated: boolean, adapterChangedFiles: string[]): string[] {
  return [
    "empty slot preview works",
    "occupied slot preview works",
    "selected slot glow works",
    "locked overlay works",
    "merge candidate pulse style is visible",
    "monster scale and vertical offset are applied visually",
    "config saved to .game-polish-lab/styles/farm-slot-style.json",
    rollbackCreated ? "rollback snapshot was created before overwrite" : "rollback snapshot was not needed because no previous config existed",
    "no save/economy/hatch/progression/merge/quest/ad files were changed",
    adapterChangedFiles.length > 0 ? `adapter changed visual/style files only: ${adapterChangedFiles.join(", ")}` : "adapter did not change source files"
  ];
}

function logChecklist(checklist: string[]): void {
  logInfo("v0.5 manual test checklist:");
  for (const item of checklist) {
    logInfo(`- ${item}`);
  }
}

function renderTuneVisualSurfaceHtml(webview: vscode.Webview, input: {
  initialConfig: SlotCardStyleConfig;
  adapterLikelyFiles: string[];
  adapterWarnings: string[];
}): string {
  const nonce = createNonce();
  const payload = JSON.stringify({
    presets: slotCardPresets,
    bounds: slotCardStyleBounds,
    beforeValues: defaultSlotCardStyle,
    initialConfig: input.initialConfig,
    adapterLikelyFiles: input.adapterLikelyFiles,
    adapterWarnings: input.adapterWarnings
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Polish Lab v0.5</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
      --panel: var(--vscode-editorWidget-background);
      --border: var(--vscode-panel-border);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --button: var(--vscode-button-background);
      --button-text: var(--vscode-button-foreground);
      --focus: var(--vscode-focusBorder);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 18px;
      color: var(--text);
      font-family: var(--vscode-font-family);
      background: var(--vscode-editor-background);
    }
    main {
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(360px, 1fr);
      gap: 18px;
      align-items: start;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 20px; font-weight: 650; }
    h2 { font-size: 15px; margin-bottom: 10px; }
    h3 { font-size: 13px; margin-bottom: 8px; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 16px;
    }
    .meta {
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .panel {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 8px;
      padding: 14px;
    }
    .controls {
      display: grid;
      gap: 12px;
    }
    label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 5px;
    }
    select, input[type="number"], input[type="color"] {
      width: 100%;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border));
      border-radius: 4px;
      min-height: 28px;
    }
    input[type="range"] {
      width: 100%;
    }
    .control-row {
      display: grid;
      grid-template-columns: 1fr 76px;
      gap: 8px;
      align-items: center;
    }
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(280px, 1fr));
      gap: 14px;
    }
    .preview-stage {
      min-width: 0;
    }
    .slot-board {
      display: grid;
      justify-content: start;
      align-content: start;
      padding: 14px;
      min-height: 390px;
      overflow: auto;
      background: color-mix(in srgb, var(--vscode-editor-background) 82%, #000 18%);
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .slot-card {
      position: relative;
      display: grid;
      place-items: center;
      width: var(--slot-width);
      height: var(--slot-height);
      opacity: 1;
      background: var(--fill-color);
      border: var(--border-width) solid var(--border-color);
      border-radius: var(--corner-radius);
      overflow: hidden;
      transform: scale(1);
      transform-origin: center;
      transition: box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease;
    }
    .slot-card.empty {
      opacity: var(--empty-opacity);
    }
    .slot-card.selected {
      box-shadow: 0 0 calc(28px * var(--selected-glow)) calc(4px * var(--selected-glow)) var(--border-color);
    }
    .slot-card.locked::after {
      content: "";
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, var(--locked-opacity));
    }
    .slot-card.merge {
      transform: scale(var(--pulse-scale));
      box-shadow: 0 0 calc(18px * var(--selected-glow)) var(--border-color);
    }
    .state-label {
      position: absolute;
      left: 6px;
      top: 5px;
      z-index: 2;
      font-size: 10px;
      color: #ffffff;
      text-shadow: 0 1px 2px #000000;
      pointer-events: none;
    }
    .monster {
      width: 52px;
      height: 52px;
      border-radius: 45% 45% 38% 38%;
      background: radial-gradient(circle at 34% 28%, #ffffff 0 8%, #81d37b 9% 44%, #2f8a4a 45% 100%);
      border: 3px solid #173f25;
      transform: translateY(var(--monster-offset)) scale(var(--monster-scale));
      box-shadow: inset -8px -8px 0 rgba(0, 0, 0, 0.18);
    }
    .empty-mark {
      width: 44%;
      height: 4px;
      border-radius: 3px;
      background: color-mix(in srgb, var(--border-color) 70%, transparent);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 14px;
    }
    button {
      min-height: 30px;
      color: var(--button-text);
      background: var(--button);
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 4px 12px;
      cursor: pointer;
    }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button:focus-visible, select:focus-visible, input:focus-visible {
      outline: 1px solid var(--focus);
      outline-offset: 1px;
    }
    .status {
      margin-top: 12px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .list {
      margin: 8px 0 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    @media (max-width: 900px) {
      main, .preview-grid { grid-template-columns: 1fr; }
      .header { display: block; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Game Polish Lab v0.5: Visual Tuning Proof</h1>
      <p class="meta">Surface: <strong>slot_card</strong> - Adapter target: <strong>idle_monster_farm.farm_slots</strong></p>
    </div>
  </div>
  <main>
    <section class="panel">
      <h2>Style Values</h2>
      <div class="controls">
        <div>
          <label for="preset">Preset</label>
          <select id="preset"></select>
        </div>
        <div id="controls"></div>
      </div>
      <div class="actions">
        <button class="secondary" id="reset">Reset</button>
        <button id="save">Save & Apply</button>
      </div>
      <div id="status" class="status"></div>
    </section>
    <section class="preview-grid">
      <div class="preview-stage">
        <h2>Before</h2>
        <div id="before" class="slot-board"></div>
      </div>
      <div class="preview-stage">
        <h2>After</h2>
        <div id="after" class="slot-board"></div>
      </div>
    </section>
  </main>
  <section class="panel" style="margin-top: 14px;">
    <h3>Adapter Detection</h3>
    <ul id="adapter" class="list"></ul>
  </section>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const data = ${payload};
    const numericKeys = [
      "slotWidth",
      "slotHeight",
      "gap",
      "borderWidth",
      "cornerRadius",
      "selectedGlowStrength",
      "lockedOverlayOpacity",
      "emptySlotOpacity",
      "mergeCandidatePulseScale",
      "monsterDisplayScale",
      "monsterVerticalOffset"
    ];
    const labels = {
      slotWidth: "Slot width",
      slotHeight: "Slot height",
      gap: "Gap",
      borderWidth: "Border width",
      cornerRadius: "Corner radius",
      fillColor: "Fill color",
      borderColor: "Border color",
      selectedGlowStrength: "Selected glow strength",
      lockedOverlayOpacity: "Locked overlay opacity",
      emptySlotOpacity: "Empty slot opacity",
      mergeCandidatePulseScale: "Merge candidate pulse scale",
      monsterDisplayScale: "Monster display scale",
      monsterVerticalOffset: "Monster vertical offset"
    };
    let presetName = data.initialConfig.presetName;
    let values = structuredClone(data.initialConfig.values);

    const presetSelect = document.getElementById("preset");
    const controls = document.getElementById("controls");
    const status = document.getElementById("status");

    for (const preset of data.presets) {
      const option = document.createElement("option");
      option.value = preset.name;
      option.textContent = preset.name;
      option.selected = preset.name === presetName;
      presetSelect.append(option);
    }
    if (![...presetSelect.options].some((option) => option.value === presetName)) {
      const option = document.createElement("option");
      option.value = presetName;
      option.textContent = presetName;
      option.selected = true;
      presetSelect.append(option);
    }

    function buildControls() {
      controls.textContent = "";
      for (const key of numericKeys) {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = labels[key];
        label.htmlFor = key;
        const row = document.createElement("div");
        row.className = "control-row";
        const range = document.createElement("input");
        const number = document.createElement("input");
        const bounds = data.bounds[key];
        range.type = "range";
        range.id = key;
        range.min = bounds.min;
        range.max = bounds.max;
        range.step = bounds.step;
        range.value = values[key];
        number.type = "number";
        number.min = bounds.min;
        number.max = bounds.max;
        number.step = bounds.step;
        number.value = values[key];
        range.addEventListener("input", () => setNumber(key, range.value, number, range));
        number.addEventListener("input", () => setNumber(key, number.value, number, range));
        row.append(range, number);
        wrapper.append(label, row);
        controls.append(wrapper);
      }
      for (const key of ["fillColor", "borderColor"]) {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = labels[key];
        label.htmlFor = key;
        const input = document.createElement("input");
        input.type = "color";
        input.id = key;
        input.value = values[key];
        input.addEventListener("input", () => {
          values[key] = input.value;
          render();
        });
        wrapper.append(label, input);
        controls.append(wrapper);
      }
    }

    function setNumber(key, raw, number, range) {
      const bounds = data.bounds[key];
      const next = Math.min(bounds.max, Math.max(bounds.min, Number(raw)));
      values[key] = next;
      number.value = next;
      range.value = next;
      render();
    }

    presetSelect.addEventListener("change", () => {
      const preset = data.presets.find((candidate) => candidate.name === presetSelect.value);
      if (!preset) return;
      presetName = preset.name;
      values = structuredClone(preset.values);
      buildControls();
      render();
    });

    document.getElementById("reset").addEventListener("click", () => {
      const preset = data.presets.find((candidate) => candidate.name === presetName) ?? data.presets[0];
      values = structuredClone(preset.values);
      buildControls();
      render();
    });

    document.getElementById("save").addEventListener("click", () => {
      status.textContent = "Saving style config and applying supported visual values...";
      vscode.postMessage({ command: "saveAndApply", presetName, values });
    });

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.command !== "saveResult") return;
      if (!message.ok) {
        status.textContent = "Save/apply failed: " + message.error;
        return;
      }
      const lines = [
        "Saved: " + message.configPath,
        message.rollbackPath ? "Rollback: " + message.rollbackPath : "Rollback: not needed on first save",
        "",
        "Adapter:",
        ...(message.applySummary ?? []),
        "",
        "Manual checklist:",
        ...(message.checklist ?? []).map((item) => "- " + item)
      ];
      status.textContent = lines.join("\\n");
    });

    function render() {
      renderBoard(document.getElementById("before"), data.beforeValues);
      renderBoard(document.getElementById("after"), values);
    }

    function renderBoard(container, style) {
      container.textContent = "";
      container.style.gridTemplateColumns = "repeat(3, " + style.slotWidth + "px)";
      container.style.gap = style.gap + "px";
      container.style.setProperty("--slot-width", style.slotWidth + "px");
      container.style.setProperty("--slot-height", style.slotHeight + "px");
      container.style.setProperty("--border-width", style.borderWidth + "px");
      container.style.setProperty("--corner-radius", style.cornerRadius + "px");
      container.style.setProperty("--fill-color", style.fillColor);
      container.style.setProperty("--border-color", style.borderColor);
      container.style.setProperty("--selected-glow", style.selectedGlowStrength);
      container.style.setProperty("--locked-opacity", style.lockedOverlayOpacity);
      container.style.setProperty("--empty-opacity", style.emptySlotOpacity);
      container.style.setProperty("--pulse-scale", style.mergeCandidatePulseScale);
      container.style.setProperty("--monster-scale", style.monsterDisplayScale);
      container.style.setProperty("--monster-offset", style.monsterVerticalOffset + "px");
      const states = ["empty", "occupied", "selected", "locked", "merge candidate"];
      for (let index = 0; index < 9; index += 1) {
        const state = states[index % states.length];
        const card = document.createElement("div");
        card.className = "slot-card " + classForState(state);
        const label = document.createElement("span");
        label.className = "state-label";
        label.textContent = state;
        card.append(label);
        if (state === "empty") {
          const mark = document.createElement("div");
          mark.className = "empty-mark";
          card.append(mark);
        } else {
          const monster = document.createElement("div");
          monster.className = "monster";
          card.append(monster);
        }
        container.append(card);
      }
    }

    function classForState(state) {
      if (state === "merge candidate") return "merge";
      return state;
    }

    const adapterList = document.getElementById("adapter");
    const adapterLines = [
      ...(data.adapterLikelyFiles.length > 0 ? data.adapterLikelyFiles : ["No likely farm slot files detected."]),
      ...data.adapterWarnings.map((warning) => "Warning: " + warning)
    ];
    for (const line of adapterLines) {
      const item = document.createElement("li");
      item.textContent = line;
      adapterList.append(item);
    }

    buildControls();
    render();
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
