import "server-only";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Local disk storage for attachments (demo). A real deploy would use object
// storage (S3/R2/etc.) behind the same repository/action boundary.
export const UPLOADS_DIR = join(process.cwd(), ".data", "uploads");

export function ensureUploadsDir(): void {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed file extensions (lowercase, no dot). */
export const ALLOWED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg",
  "pdf", "txt", "csv", "md", "json", "log",
  "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
]);

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}
