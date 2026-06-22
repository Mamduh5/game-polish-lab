import { hitSparkConfig } from "../config/vfxConfig";

export function createHitSpark(x: number, y: number): void {
  console.log("hit spark", x, y, hitSparkConfig.durationMs);
}
