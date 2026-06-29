const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = readJson("package.json");
const failures = [];

function requireField(name, value) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    failures.push(`package.json missing ${name}`);
  }
}

requireField("name", packageJson.name);
requireField("displayName", packageJson.displayName);
requireField("description", packageJson.description);
requireField("version", packageJson.version);
requireField("publisher", packageJson.publisher);
requireField("engines.vscode", packageJson.engines && packageJson.engines.vscode);
requireField("categories", packageJson.categories);
requireField("keywords", packageJson.keywords);
requireField("repository.url", packageJson.repository && packageJson.repository.url);
requireField("bugs.url", packageJson.bugs && packageJson.bugs.url);
requireField("homepage", packageJson.homepage);
requireField("main", packageJson.main);

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version || "")) {
  failures.push("package.json version must be semver x.y.z");
}
if (!packageJson.description || !packageJson.description.toLowerCase().includes("vs code")) {
  failures.push("package.json description should identify the VS Code extension workflow");
}
if (!Array.isArray(packageJson.activationEvents) || !packageJson.activationEvents.every((event) => event.startsWith("onCommand:"))) {
  failures.push("activationEvents must be command-based for this release");
}

const commands = packageJson.contributes && Array.isArray(packageJson.contributes.commands)
  ? packageJson.contributes.commands
  : [];
if (commands.length === 0) {
  failures.push("contributes.commands is empty");
}
const commandIds = new Set(commands.map((command) => command.command));
for (const command of commands) {
  if (!command.command || !command.title) {
    failures.push("every contributed command must include command and title");
  }
  if (command.title && !command.title.startsWith("Game Polish Lab: ")) {
    failures.push(`command title should be user-facing and prefixed: ${command.command}`);
  }
}
for (const event of packageJson.activationEvents || []) {
  const commandId = event.replace(/^onCommand:/, "");
  if (!commandIds.has(commandId)) {
    failures.push(`activation event has no contributed command: ${commandId}`);
  }
}

const requiredCommands = [
  "gamePolishLab.openVisualTuningDashboard",
  "gamePolishLab.tuneVisualSurface",
  "gamePolishLab.openAssetPipelineDashboard",
  "gamePolishLab.openRollbackHistory",
  "gamePolishLab.checkCodexScope",
  "gamePolishLab.refreshAssetContracts"
];
for (const commandId of requiredCommands) {
  if (!commandIds.has(commandId)) {
    failures.push(`required command missing: ${commandId}`);
  }
}

const scripts = packageJson.scripts || {};
for (const scriptName of ["compile", "lint", "test", "package:check", "package", "vscode:prepublish"]) {
  if (!scripts[scriptName]) {
    failures.push(`script missing: ${scriptName}`);
  }
}
if (scripts.package && /publish|vsce\s+publish/.test(scripts.package)) {
  failures.push("package script must not publish");
}

const expectedDocs = [
  "CHANGELOG.md",
  "docs/extension-packaging.md",
  "docs/ci.md",
  "docs/quick-start.md",
  "docs/monster-farm-walkthrough.md",
  "docs/sort-puzzle-walkthrough.md",
  "docs/cursor-arena-walkthrough.md",
  "docs/asset-replacement-guide.md",
  "docs/direct-apply-guide.md",
  "docs/adapter-runtime-bridge-guide.md",
  "docs/fallback-task-guide.md",
  "docs/rollback-guide.md",
  "docs/release-readiness.md",
  "docs/safety-review.md",
  "docs/beta-dogfooding-v0.95.md",
  "docs/beta-dogfooding-checklist.md",
  "docs/1.0-release-candidate.md",
  "docs/1.0-rc-verification-checklist.md",
  "docs/release-notes-v1.0-rc.md",
  ".github/workflows/ci.yml"
];
for (const relativePath of expectedDocs) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`release-readiness file missing: ${relativePath}`);
  }
}

if (!fs.existsSync(path.join(root, "LICENSE"))) {
  const packagingDoc = readText("docs/extension-packaging.md");
  if (!/license selection is pending/i.test(packagingDoc)) {
    failures.push("LICENSE is absent, so docs/extension-packaging.md must state that license selection is pending");
  }
}
if (packageJson.icon && !fs.existsSync(path.join(root, packageJson.icon))) {
  failures.push(`icon path does not exist: ${packageJson.icon}`);
}

if (failures.length > 0) {
  console.error("Package readiness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Package readiness check passed for ${packageJson.name}@${packageJson.version}.`);

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
