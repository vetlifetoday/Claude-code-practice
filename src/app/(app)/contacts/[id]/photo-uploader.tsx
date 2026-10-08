"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, PHOTO_MAX_BYTES, PHOTO_TYPES, extensionOf, photoPrefix } from "@/lib/files";
import { setPhoto } from "./actions";
import { Avatar } from "@/components/avatar";

export function PhotoUploader({
  contactId,
  name,
  kind,
  src,
  hasPhoto,
  canEdit,
}: {
  contactId: string;
  name: string;
  kind: "person" | "organization";
  src: string | null;
  hasPhoto: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === "organization" ? "logo" : "photo";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!PHOTO_TYPES.includes(file.type)) return setError("Use a PNG, JPG, GIF, or WebP image.");
    if (file.size > PHOTO_MAX_BYTES) return setError("Images must be 5 MB or smaller.");
    setBusy(true);
    const path = `${photoPrefix(contactId)}${crypto.randomUUID()}.${extensionOf(file.name) || "jpg"}`;
    const { error: upErr } = await createClient().storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      return setError(`Upload failed: ${upErr.message}`);
    }
    const res = await setPhoto(contactId, path);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Remove this ${label}?`)) return;
    setBusy(true);
    const res = await setPhoto(contactId, null);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar name={name} kind={kind} src={src} size="lg" />
        {canEdit && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-navy-800 p-1.5 text-white shadow hover:bg-navy-700"
            aria-label={hasPhoto ? `Change ${label}` : `Add ${label}`}
            title={hasPhoto ? `Change ${label}` : `Add ${label}`}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
          </button>
        )}
      </div>
      {canEdit && (
        <input
          ref={input}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          aria-label={`Upload ${label}`}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      )}
      {canEdit && hasPhoto && !busy && (
        <button type="button" onClick={remove} className="text-xs text-slate-500 hover:text-red-700 hover:underline">
          Remove {label}
        </button>
      )}
      {error && <p className="max-w-40 text-center text-xs text-red-700">{error}</p>}
    </div>
  );
}
