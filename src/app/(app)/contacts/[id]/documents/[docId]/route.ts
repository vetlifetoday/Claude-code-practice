import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/files";

/**
 * Opens a document. Checks the user can see it (Row Level Security), then
 * redirects to a signed URL that expires after 60 seconds.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/contacts/[id]/documents/[docId]">) {
  const { id, docId } = await ctx.params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return NextResponse.redirect(new URL("/login", request.url));

  const { data: doc } = await supabase
    .from("contact_documents")
    .select("storage_path, file_name")
    .eq("id", docId)
    .eq("contact_id", id)
    .maybeSingle();
  if (!doc) return new NextResponse("Document not found", { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 60, download ? { download: doc.file_name } : undefined);
  if (error || !data) return new NextResponse("Could not open this document", { status: 500 });

  const res = NextResponse.redirect(data.signedUrl);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
