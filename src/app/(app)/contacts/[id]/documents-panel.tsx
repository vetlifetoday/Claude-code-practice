"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileImage, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, DOC_ACCEPT, DOC_MAX_BYTES, docContentType, docPrefix, safeFileName } from "@/lib/files";
import { archiveDocument, registerDocuments } from "./actions";
import { Button } from "@/components/ui";
import { cn, formatBytes, formatDate } from "@/lib/utils";

export type DocumentRow = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  uploader: string | null;
};

export function DocumentsPanel({
  contactId,
  documents,
  canEdit,
}: {
  contactId: string;
  documents: DocumentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [removing, startRemove] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function upload(fileList: FileList | File[]) {
    const files = [...fileList];
    if (files.length === 0) return;
    const problems: string[] = [];
    const uploaded: { path: string; name: string; size: number }[] = [];
    const supabase = createClient();

    for (const [i, file] of files.entries()) {
      const type = docContentType(file.name);
      if (!type) {
        problems.push(`${file.name}: only PDF, image (PNG, JPG, GIF, WebP), and Word files are allowed.`);
        continue;
      }
      if (file.size > DOC_MAX_BYTES) {
        problems.push(`${file.name}: files must be 25 MB or smaller.`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name}: the file is empty.`);
        continue;
      }
      setUploading(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
      const path = `${docPrefix(contactId)}${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: type });
      if (error) problems.push(`${file.name}: ${error.message}`);
      else uploaded.push({ path, name: file.name, size: file.size });
    }

    if (uploaded.length) {
      const res = await registerDocuments(contactId, uploaded);
      if (res.error) problems.push(res.error);
    }
    setUploading(null);
    setErrors(problems);
    router.refresh();
  }

  return (
    <div>
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading) upload(e.dataTransfer.files);
          }}
          className={cn(
            "m-4 rounded-md border-2 border-dashed px-4 py-5 text-center text-sm transition-colors sm:mx-5",
            dragging ? "border-navy-500 bg-navy-50" : "border-slate-300",
          )}
        >
          {uploading ? (
            <p className="flex items-center justify-center gap-2 text-navy-700">
              <Loader2 className="size-4 animate-spin" aria-hidden /> {uploading}
            </p>
          ) : (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
                <Upload className="size-4" aria-hidden /> Upload files
              </Button>
              <p className="mt-2 text-xs text-slate-500">or drag them here · PDF, images, Word · up to 25 MB each</p>
            </>
          )}
          <input
            ref={input}
            type="file"
            multiple
            accept={DOC_ACCEPT}
            className="sr-only"
            aria-label="Upload documents"
            onChange={(e) => {
              if (e.target.files) upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mx-4 mb-3 space-y-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 sm:mx-5" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {documents.length === 0 ? (
        <p className="px-4 pb-5 text-center text-sm text-slate-500 sm:px-5">{canEdit ? "No documents yet." : "No documents."}</p>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {documents.map((d) => {
            const Icon = d.mime_type?.startsWith("image/") ? FileImage : FileText;
            return (
              <li key={d.id} className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", removingId === d.id && removing && "opacity-50")}>
                <Icon className="size-5 shrink-0 text-navy-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <a
                    href={`/contacts/${contactId}/documents/${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-navy-700 hover:underline"
                  >
                    {d.file_name}
                  </a>
                  <p className="truncate text-xs text-slate-500">
                    {[formatBytes(d.size_bytes), formatDate(d.created_at), d.uploader].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <a
                  href={`/contacts/${contactId}/documents/${d.id}?download=1`}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                  aria-label={`Download ${d.file_name}`}
                >
                  <Download className="size-4" />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove ${d.file_name}`}
                    onClick={() => {
                      if (!confirm(`Remove ${d.file_name}? An administrator can restore it from the Archive.`)) return;
                      setRemovingId(d.id);
                      startRemove(async () => {
                        const res = await archiveDocument(d.id, contactId);
                        if (res.error) setErrors([res.error]);
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
