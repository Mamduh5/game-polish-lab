import * as path from "path";
import { inflateSync } from "zlib";

import { buildRollbackSnapshotName } from "./visualSurfaceConfig";
import { AcceptedAssetFileType, AssetReplacementModel, AssetReplacementTarget } from "../types/visualSurface";

export interface ImportedAssetFile {
  fileName: string;
  bytes: Uint8Array;
}

export interface AssetImageInfo {
  fileType: AcceptedAssetFileType | "unsupported";
  width?: number;
  height?: number;
  hasAlpha: boolean;
  visiblePixelCount?: number;
  visibleBounds?: { x: number; y: number; width: number; height: number };
}

export interface AssetValidationResult {
  ok: boolean;
  model: AssetReplacementModel;
  safeFileName: string;
  imageInfo: AssetImageInfo;
}

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function validateReplacementAsset(input: ImportedAssetFile, target: AssetReplacementTarget): AssetValidationResult {
  const validationWarnings: string[] = [];
  const validationErrors: string[] = [];
  const safeFileName = normalizeAssetFileName(input.fileName);
  if (!safeFileName) {
    validationErrors.push("Filename is unsafe or empty after normalization.");
  }
  if (hasPathTraversal(input.fileName)) {
    validationErrors.push("Filename/path contains path traversal.");
  }

  const imageInfo = inspectAssetImage(input.bytes);
  if (imageInfo.fileType === "unsupported" || !target.acceptedFileTypes.includes(imageInfo.fileType)) {
    validationErrors.push("Only PNG and WebP replacement assets are supported for this target.");
  }
  if (target.expectedWidth && imageInfo.width && Math.abs(imageInfo.width - target.expectedWidth) > target.expectedWidth * 0.5) {
    validationWarnings.push(`Image width ${imageInfo.width}px differs from expected ${target.expectedWidth}px.`);
  }
  if (target.expectedHeight && imageInfo.height && Math.abs(imageInfo.height - target.expectedHeight) > target.expectedHeight * 0.5) {
    validationWarnings.push(`Image height ${imageInfo.height}px differs from expected ${target.expectedHeight}px.`);
  }
  if (target.transparencyRequired && !imageInfo.hasAlpha) {
    validationErrors.push("This target expects transparency/alpha.");
  }
  if (imageInfo.visiblePixelCount === 0) {
    validationErrors.push("Visible bounds are empty; the image appears fully transparent.");
  }
  if (imageInfo.width && imageInfo.height && imageInfo.visiblePixelCount !== undefined) {
    const visibleRatio = imageInfo.visiblePixelCount / (imageInfo.width * imageInfo.height);
    if (visibleRatio > 0 && visibleRatio < 0.01) {
      validationErrors.push("Visible bounds are tiny relative to the canvas.");
    }
  }

  const destinationPath = safeFileName ? `${target.destinationFolder}/${safeFileName}` : target.destinationFolder;
  return {
    ok: validationErrors.length === 0,
    safeFileName,
    imageInfo,
    model: {
      assetTargetId: target.targetId,
      surfaceType: "asset_replacement",
      adapterId: "idle_monster_farm.assets",
      expectedKinds: target.expectedKinds,
      acceptedFileTypes: target.acceptedFileTypes,
      expectedWidth: target.expectedWidth,
      expectedHeight: target.expectedHeight,
      transparencyRequired: target.transparencyRequired,
      destinationPath,
      assignmentMode: target.assignmentMode,
      validationWarnings,
      validationErrors
    }
  };
}

export function inspectAssetImage(bytes: Uint8Array): AssetImageInfo {
  if (isPng(bytes)) {
    return inspectPng(bytes);
  }
  if (isWebP(bytes)) {
    return inspectWebP(bytes);
  }
  return { fileType: "unsupported", hasAlpha: false };
}

export function normalizeAssetFileName(fileName: string): string {
  const baseName = path.basename(fileName).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
  if (!baseName || baseName === "." || baseName === ".." || hasPathTraversal(fileName)) {
    return "";
  }
  return baseName;
}

export function hasPathTraversal(value: string): boolean {
  return value.includes("..") || value.includes("/") || value.includes("\\") || path.basename(value) !== value;
}

export function buildAssetRollbackSnapshotName(date: Date, affectedRelativePath: string, assetTargetId: string): string {
  const baseName = buildRollbackSnapshotName(date, affectedRelativePath);
  const timestampPrefix = date.toISOString().replace(/[:.]/g, "-");
  return baseName.replace(`${timestampPrefix}-`, `${timestampPrefix}-${assetTargetId}-`);
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 24 && pngSignature.every((value, index) => bytes[index] === value);
}

function isWebP(bytes: Uint8Array): boolean {
  return bytes.length >= 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
}

function inspectPng(bytes: Uint8Array): AssetImageInfo {
  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);
  const colorType = bytes[25];
  const hasAlpha = colorType === 4 || colorType === 6 || hasPngChunk(bytes, "tRNS");
  const visible = inspectSimpleRgbaPngVisibleBounds(bytes, width, height, colorType);
  return {
    fileType: "image/png",
    width,
    height,
    hasAlpha,
    visiblePixelCount: visible?.visiblePixelCount,
    visibleBounds: visible?.visibleBounds
  };
}

function inspectWebP(bytes: Uint8Array): AssetImageInfo {
  const chunkType = ascii(bytes, 12, 4);
  if (chunkType === "VP8X" && bytes.length >= 30) {
    const flags = bytes[20];
    const width = 1 + readUint24LE(bytes, 24);
    const height = 1 + readUint24LE(bytes, 27);
    return { fileType: "image/webp", width, height, hasAlpha: Boolean(flags & 0x10) };
  }
  if (chunkType === "VP8 " && bytes.length >= 30) {
    const width = readUint16LE(bytes, 26) & 0x3fff;
    const height = readUint16LE(bytes, 28) & 0x3fff;
    return { fileType: "image/webp", width, height, hasAlpha: false };
  }
  if (chunkType === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { fileType: "image/webp", width, height, hasAlpha: true };
  }
  return { fileType: "image/webp", hasAlpha: false };
}

function inspectSimpleRgbaPngVisibleBounds(bytes: Uint8Array, width: number, height: number, colorType: number): Pick<AssetImageInfo, "visiblePixelCount" | "visibleBounds"> | undefined {
  if (colorType !== 6 || width <= 0 || height <= 0) {
    return undefined;
  }
  const idatChunks = findPngChunks(bytes, "IDAT");
  if (idatChunks.length === 0) {
    return undefined;
  }
  const compressed = concatBytes(...idatChunks);
  const idat = inflateOrUseRaw(compressed);
  const rowLength = 1 + width * 4;
  const expectedLength = rowLength * height;
  if (idat.length < expectedLength) {
    return undefined;
  }
  const rgba = unfilterRgbaRows(idat, width, height);
  if (!rgba) {
    return undefined;
  }
  let visiblePixelCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const alpha = rgba[rowStart + x * 4 + 3];
      if (alpha > 8) {
        visiblePixelCount += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    visiblePixelCount,
    visibleBounds: visiblePixelCount > 0 ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : undefined
  };
}

function hasPngChunk(bytes: Uint8Array, chunkType: string): boolean {
  return Boolean(findPngChunk(bytes, chunkType));
}

function findPngChunk(bytes: Uint8Array, chunkType: string): Uint8Array | undefined {
  return findPngChunks(bytes, chunkType)[0];
}

function findPngChunks(bytes: Uint8Array, chunkType: string): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) {
      return chunks;
    }
    if (type === chunkType) {
      chunks.push(bytes.slice(dataStart, dataEnd));
    }
    offset = dataEnd + 4;
  }
  return chunks;
}

function inflateOrUseRaw(bytes: Uint8Array): Uint8Array {
  try {
    return inflateSync(bytes);
  } catch {
    return bytes;
  }
}

function unfilterRgbaRows(filtered: Uint8Array, width: number, height: number): Uint8Array | undefined {
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const stride = rowBytes + 1;
  const result = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const filterType = filtered[y * stride];
    const sourceStart = y * stride + 1;
    const targetStart = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = filtered[sourceStart + x];
      const left = x >= bytesPerPixel ? result[targetStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? result[targetStart + x - rowBytes] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? result[targetStart + x - rowBytes - bytesPerPixel] : 0;
      switch (filterType) {
        case 0:
          result[targetStart + x] = raw;
          break;
        case 1:
          result[targetStart + x] = (raw + left) & 0xff;
          break;
        case 2:
          result[targetStart + x] = (raw + up) & 0xff;
          break;
        case 3:
          result[targetStart + x] = (raw + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          result[targetStart + x] = (raw + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          return undefined;
      }
    }
  }
  return result;
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) {
    return left;
  }
  return pb <= pc ? up : upLeft;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
