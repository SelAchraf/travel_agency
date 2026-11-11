import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { AppError } from "../middleware/errorHandler.js";

const DEFAULT_STORAGE_DIR = path.resolve(process.cwd(), "storage/private");

export function getPrivateStorageDir(): string {
  const dir = process.env.STORAGE_PRIVATE_PATH || DEFAULT_STORAGE_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function detectMimeFromMagicBytes(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function getExtensionForMime(mime: AllowedMimeType): string {
  switch (mime) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
  }
}

export interface StoredFileInfo {
  storageFilename: string;
  fullPath: string;
  fileSizeBytes: number;
  fileSha256: string;
  mimeType: AllowedMimeType;
}

export async function savePrivateFile(
  buffer: Buffer,
  _originalFilename: string
): Promise<StoredFileInfo> {
  const verifiedMime = detectMimeFromMagicBytes(buffer);
  if (!verifiedMime) {
    throw new AppError(
      400,
      "Format de fichier non autorisé ou fichier altéré (seuls PDF, JPEG, PNG, WEBP sont acceptés) / File format rejected by magic byte inspection"
    );
  }

  const fileSizeBytes = buffer.length;
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (fileSizeBytes > maxSizeBytes) {
    throw new AppError(
      400,
      "Fichier trop volumineux (maximum 10 Mo) / File exceeds 10MB limit"
    );
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = getExtensionForMime(verifiedMime);
  const storageFilename = `${crypto.randomUUID()}${ext}`;
  const storageDir = getPrivateStorageDir();
  const fullPath = path.join(storageDir, storageFilename);

  await fs.promises.writeFile(fullPath, buffer, { mode: 0o600 });

  return {
    storageFilename,
    fullPath,
    fileSizeBytes,
    fileSha256: hash,
    mimeType: verifiedMime,
  };
}

export function getPrivateFilePath(storageFilename: string): string {
  // Prevent path traversal
  const sanitized = path.basename(storageFilename);
  const storageDir = getPrivateStorageDir();
  return path.join(storageDir, sanitized);
}

export async function deletePrivateFile(storageFilename: string): Promise<void> {
  try {
    const fullPath = getPrivateFilePath(storageFilename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    // Log but don't fail if already gone
  }
}
