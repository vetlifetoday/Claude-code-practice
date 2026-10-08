/** Shared file rules (used in the browser and on the server). */

export const BUCKET = "contact-files";

export const PHOTO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const DOC_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const DOC_MAX_BYTES = 25 * 1024 * 1024;
export const DOC_ACCEPT = Object.keys(DOC_TYPES).map((e) => `.${e}`).join(",");

export function extensionOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/** The content type to store, based on the extension (browsers sometimes leave it blank). */
export function docContentType(name: string): string | null {
  return DOC_TYPES[extensionOf(name)] ?? null;
}

/** Keeps file names readable but safe for storage paths. */
export function safeFileName(name: string) {
  const ext = extensionOf(name);
  const base = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export const photoPrefix = (contactId: string) => `contacts/${contactId}/photo/`;
export const docPrefix = (contactId: string) => `contacts/${contactId}/docs/`;
