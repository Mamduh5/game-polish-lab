import { VisualDirectApplyAdapterId, VisualDirectApplyManualCheck } from "./visualDirectApplyTemplate";
import { VisualSurfaceType } from "./visualSurface";

export type VisualGameAdapterFamily = "idle_monster_farm" | "generic_phaser" | "sort_puzzle" | "cursor_arena";
export type VisualAdapterPreviewSupport = "supported" | "not_supported";
export type VisualAdapterDirectApplySupport = "executable" | "config_only" | "fallback_only" | "unsupported";
export type VisualAdapterAssetReplacementSupport = "supported" | "manual_required" | "not_supported";
export type VisualAdapterFallbackSupport = "available" | "manual_required" | "not_available";

export interface VisualAdapterProjectDetection {
  detected: boolean;
  confidence: "high" | "medium" | "low" | "unknown";
  evidence: string[];
  warnings: string[];
}

export interface VisualAdapterScopeGroup {
  paths: string[];
  reason: string;
  surfaceType?: VisualSurfaceType;
}

export interface VisualAdapterScopeDescriptor {
  safe: VisualAdapterScopeGroup[];
  suspicious: VisualAdapterScopeGroup[];
  forbidden: VisualAdapterScopeGroup[];
}

export interface VisualAdapterDirectApplyCapability {
  support: VisualAdapterDirectApplySupport;
  templateId?: string;
  styleConfigPath?: string;
  generatedStyleModulePath?: string;
  reason?: string;
}

export interface VisualAdapterFallbackCapability {
  support: VisualAdapterFallbackSupport;
  reason: string;
}

export interface VisualAdapterSurfaceTarget {
  surfaceType: VisualSurfaceType;
  targetId: string;
  displayName: string;
  likelyOwnerFiles: string[];
  styleConfigPath?: string;
  generatedStyleModulePath?: string;
  previewSupport: VisualAdapterPreviewSupport;
  directApply: VisualAdapterDirectApplyCapability;
  assetReplacementSupport: VisualAdapterAssetReplacementSupport;
  fallback: VisualAdapterFallbackCapability;
  manualChecks: VisualDirectApplyManualCheck[];
  limitations: string[];
  supportedStyleTokens?: string[];
}

export interface VisualGameAdapter {
  id: VisualDirectApplyAdapterId;
  displayName: string;
  family: VisualGameAdapterFamily;
  version: string;
  description: string;
  supportedSurfaces: VisualSurfaceType[];
  detectProject: (files: Array<{ relativePath: string; text: string }>) => VisualAdapterProjectDetection;
  getSurfaceTargets: (surfaceType?: VisualSurfaceType) => VisualAdapterSurfaceTarget[];
  getSafeScopes: (surfaceType?: VisualSurfaceType) => VisualAdapterScopeDescriptor;
  getStyleConfigPath: (surfaceType: VisualSurfaceType, targetId?: string) => string | undefined;
  getDirectApplyCapabilities: (surfaceType: VisualSurfaceType, targetId?: string) => VisualAdapterDirectApplyCapability;
  getFallbackCapabilities: (surfaceType: VisualSurfaceType, targetId?: string) => VisualAdapterFallbackCapability;
  getManualChecks: (surfaceType: VisualSurfaceType, targetId?: string) => VisualDirectApplyManualCheck[];
  knownLimitations: string[];
}

export interface VisualGameAdapterValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  adapterId?: string;
  surfaceType?: VisualSurfaceType;
  targetId?: string;
}

export interface VisualGameAdapterValidationResult {
  ok: boolean;
  errors: VisualGameAdapterValidationIssue[];
  warnings: VisualGameAdapterValidationIssue[];
}

export interface VisualGameAdapterContractSummary {
  adapterId: VisualDirectApplyAdapterId;
  displayName: string;
  family: VisualGameAdapterFamily;
  valid: boolean;
  supportedSurfaceCount: number;
  targetCount: number;
  directApplyCapableSurfaceCount: number;
  fallbackOnlySurfaceCount: number;
  knownLimitationsCount: number;
  errorCount: number;
  warningCount: number;
}
