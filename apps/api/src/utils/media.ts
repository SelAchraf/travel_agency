import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { AppError } from "../middleware/errorHandler.js";

// Allowed image MIME types and their magic bytes
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Validates file buffer by reading magic bytes.
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }
  // WebP: RIFF ... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return true;
  }
  // AVIF / HEIF: ftypavif or ftypavis at offset 4
  const ftyp = buffer.toString("ascii", 4, 12);
  if (ftyp.includes("ftypavif") || ftyp.includes("ftypavis")) {
    return true;
  }

  return false;
}

export interface ProcessedImageResult {
  filename: string;
  url: string;
  webpUrl: string;
  avifUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  lqipBase64: string;
}

/**
 * Sharp image pipeline:
 * Converts raw upload to optimized WebP, AVIF, generates responsive thumbnail, and generates blur LQIP placeholder.
 */
export async function processPublicImage(
  buffer: Buffer,
  subfolder: "offers" | "destinations" = "offers",
): Promise<ProcessedImageResult> {
  if (!validateImageMagicBytes(buffer)) {
    throw new AppError(400, "Format d'image non valide / Invalid image format. Allowed: JPG, PNG, WebP, AVIF");
  }

  const baseDir = path.resolve(process.cwd(), "storage/public/images", subfolder);
  await fs.mkdir(baseDir, { recursive: true });

  const randomId = crypto.randomBytes(16).toString("hex");
  const webpName = `${randomId}.webp`;
  const avifName = `${randomId}.avif`;
  const thumbName = `${randomId}-thumb.webp`;

  const webpPath = path.join(baseDir, webpName);
  const avifPath = path.join(baseDir, avifName);
  const thumbPath = path.join(baseDir, thumbName);

  // 1. Process main WebP (max 1920px width)
  const mainImage = sharp(buffer).rotate(); // auto-rotate from EXIF
  const metadata = await mainImage.metadata();

  const fullWebp = await sharp(buffer)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  await fs.writeFile(webpPath, fullWebp);

  // 2. Process AVIF for ultra-compact next-gen delivery
  const fullAvif = await sharp(buffer)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .avif({ quality: 80, effort: 4 })
    .toBuffer();

  await fs.writeFile(avifPath, fullAvif);

  // 3. Process Thumbnail (320px width)
  const thumbWebp = await sharp(buffer)
    .rotate()
    .resize({ width: 320, height: 240, fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  await fs.writeFile(thumbPath, thumbWebp);

  // 4. Generate tiny blur LQIP (Low Quality Image Placeholder) as data URI
  const tinyBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 20, height: 15, fit: "cover" })
    .webp({ quality: 20 })
    .toBuffer();
  const lqipBase64 = `data:image/webp;base64,${tinyBuffer.toString("base64")}`;

  const relativeBase = `/public/images/${subfolder}`;

  return {
    filename: webpName,
    url: `${relativeBase}/${webpName}`,
    webpUrl: `${relativeBase}/${webpName}`,
    avifUrl: `${relativeBase}/${avifName}`,
    thumbnailUrl: `${relativeBase}/${thumbName}`,
    width: metadata.width || 1200,
    height: metadata.height || 800,
    lqipBase64,
  };
}
