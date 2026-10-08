// Security smoke test for the local Supabase stack.
// Usage: npx supabase start && npx supabase db reset && node scripts/test-security.mjs
// Creates admin/staff/viewer users and checks roles, RLS, soft delete, audit
// log, and the private storage bucket. Intended for local development only.
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const status = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8" }));
const URL = status.API_URL;
const PUB = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const SECRET = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
let failures = 0;
const check = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

async function makeUser(email, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Test-password-123",
    email_confirm: true,
  });
  if (error) throw error;
  if (role) await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: "Test-password-123" });
  if (e2) throw e2;
  return client;
}

const stamp = Date.now();
const anon = createClient(URL, PUB, { auth: { persistSession: false } });
{
  const { data } = await anon.from("contacts").select("id");
  check((data ?? []).length === 0, "anonymous visitors see no contacts");
}

// first-ever user becomes admin automatically (only if DB has no profiles yet)
const { count: profileCount } = await admin.from("profiles").select("*", { count: "exact", head: true });
const asAdmin = await makeUser(`admin${stamp}@example.org`, profileCount === 0 ? null : "admin");
const asStaff = await makeUser(`staff${stamp}@example.org`, "staff");
const asViewer = await makeUser(`viewer${stamp}@example.org`, "viewer");

{
  const { data } = await asAdmin.rpc("current_app_role");
  check(data === "admin", "first user / promoted user is admin");
}
{
  const { error } = await anon.auth.signUp({ email: `signup${stamp}@example.org`, password: "Test-password-123" });
  check(!!error, "public signup is disabled");
}

const { data: viewerContacts } = await asViewer.from("contacts").select("id");
check(viewerContacts.length >= 10, `viewer can read contacts (${viewerContacts.length})`);

{
  const { error } = await asViewer.from("contacts").insert({ first_name: "No", last_name: "Way" });
  check(!!error, "viewer cannot create contacts");
}
{
  const { data, error } = await asViewer.from("contacts").update({ notes: "hack" }).eq("id", viewerContacts[0].id).select();
  check(!error && data.length === 0, "viewer cannot edit contacts");
}
{
  const { data } = await asViewer.from("profiles").update({ role: "admin" }).eq("email", `viewer${stamp}@example.org`).select();
  check((data ?? []).length === 0, "viewer cannot promote themselves");
}

const { data: created, error: createErr } = await asStaff
  .from("contacts")
  .insert({ first_name: "Test", last_name: `Staff${stamp}`, email: `t${stamp}@example.org`, zip: "33704" })
  .select()
  .single();
check(!createErr && created?.id, "staff can create contacts");
check(created?.created_by != null, "created_by is stamped");

{
  const { error } = await asStaff.from("contacts").update({ archived_at: new Date().toISOString() }).eq("id", created.id);
  const { data: still } = await asStaff.from("contacts").select("archived_at").eq("id", created.id).single();
  check(!error && still.archived_at === null, "archived_at cannot be set by a direct update");
}
{
  const { error } = await asStaff.rpc("set_archived", { p_entity: "contact", p_id: created.id, p_archive: true });
  check(!!error, "staff cannot archive contacts");
}
{
  const { error } = await asStaff.from("contacts").delete().eq("id", created.id);
  const { data } = await admin.from("contacts").select("id").eq("id", created.id);
  check(data.length === 1, `hard delete is impossible (${error ? "error" : "0 rows"})`);
}
{
  const { error } = await asAdmin.rpc("set_archived", { p_entity: "contact", p_id: created.id, p_archive: true });
  check(!error, "admin can archive contacts");
  const { data: s } = await asStaff.from("contacts").select("id").eq("id", created.id);
  check(s.length === 0, "archived contacts are hidden from staff");
  const { data: a } = await asAdmin.from("contacts").select("id").eq("id", created.id);
  check(a.length === 1, "archived contacts are visible to admins");
  const { error: rErr } = await asStaff.rpc("set_archived", { p_entity: "contact", p_id: created.id, p_archive: false });
  check(!!rErr, "staff cannot restore");
  const { error: rErr2 } = await asAdmin.rpc("set_archived", { p_entity: "contact", p_id: created.id, p_archive: false });
  check(!rErr2, "admin can restore");
}

{
  const { data: log } = await asAdmin.from("audit_log").select("action").eq("entity_id", created.id).order("id");
  const actions = (log ?? []).map((r) => r.action).join(",");
  check(actions === "create,archive,restore", `audit trail recorded (${actions})`);
  const { data: staffLog } = await asStaff.from("audit_log").select("id");
  check(staffLog.length === 0, "staff cannot read the audit log");
  const { error } = await asStaff.from("audit_log").insert({ action: "x", entity_type: "y" });
  check(!!error, "nobody can write the audit log directly");
}

{
  const { data } = await asStaff.rpc("find_possible_duplicates", {
    p_email: `T${stamp}@EXAMPLE.org`, p_first_name: null, p_last_name: null, p_zip: null,
  });
  check(data?.length === 1 && data[0].reason === "Same email", "duplicate check by email (case-insensitive)");
  const { data: d2 } = await asStaff.rpc("find_possible_duplicates", {
    p_email: null, p_first_name: "marcus", p_last_name: "BELL", p_zip: "33704-1234",
  });
  check(d2?.length === 1 && d2[0].reason === "Same name and ZIP", "duplicate check by name + ZIP");
}

{
  const { data: cat } = await asAdmin.from("categories").select("id").eq("system_key", "veteran").single();
  const { data: sub } = await asAdmin.from("subcategories").select("id").eq("name", "Army").single();
  const { data: sub2 } = await asAdmin.from("subcategories").select("id").eq("name", "Monthly").single();
  const { error: e1 } = await asStaff.from("contact_categories").insert({ contact_id: created.id, category_id: cat.id, subcategory_id: sub.id });
  check(!e1, "staff can tag a contact");
  const { error: e2 } = await asStaff.from("contact_categories").insert({ contact_id: created.id, category_id: cat.id, subcategory_id: sub2.id });
  check(!!e2, "subcategory must belong to its category");
  const { error: e3 } = await asStaff.from("categories").insert({ name: `Nope ${stamp}` });
  check(!!e3, "staff cannot add categories");
  const { error: e4 } = await asAdmin.from("categories").insert({ name: `Test category ${stamp}` });
  check(!e4, "admin can add categories");

  const { data: found, count } = await asViewer
    .rpc("search_contacts", { p_category_id: cat.id, p_subcategory_id: sub.id }, { count: "exact" })
    .select("id");
  check(count >= 2 && found.length === count, `search by category/subcategory (${count})`);
  const { count: c2 } = await asViewer.rpc("search_contacts", { p_query: "o'connor" }, { count: "exact" }).select("id");
  check(c2 === 1, "text search with apostrophe");
  const { count: c3 } = await asViewer.rpc("search_contacts", { p_query: "%" }, { count: "exact" }).select("id");
  check(c3 === 0, "LIKE wildcards are escaped");
}

// timeline entries
{
  const { error: vErr } = await asViewer.from("interactions").insert({ contact_id: created.id, summary: "nope" });
  check(!!vErr, "viewer cannot add timeline entries");
  const { data: note, error: sErr } = await asStaff
    .from("interactions")
    .insert({ contact_id: created.id, summary: "Called about Vet Fest", type: "call" })
    .select()
    .single();
  check(!sErr && note, "staff can add timeline entries");
  const { error: arch } = await asStaff.rpc("set_archived", { p_entity: "interaction", p_id: note.id, p_archive: true });
  check(!arch, "staff can delete (archive) timeline entries");
  const { data: hidden } = await asStaff.from("interactions").select("id").eq("id", note.id);
  check(hidden.length === 0, "deleted entries are hidden from staff");
  const { error: rest } = await asStaff.rpc("set_archived", { p_entity: "interaction", p_id: note.id, p_archive: false });
  check(!!rest, "staff cannot restore timeline entries");
  const { error: rest2 } = await asAdmin.rpc("set_archived", { p_entity: "interaction", p_id: note.id, p_archive: false });
  check(!rest2, "admin can restore timeline entries");
}

// storage
{
  const path = `contacts/${created.id}/docs/${stamp}-test.pdf`;
  const blob = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
  const { error: vUp } = await asViewer.storage.from("contact-files").upload(`contacts/${created.id}/docs/v.pdf`, blob);
  check(!!vUp, "viewer cannot upload files");
  const { error: up } = await asStaff.storage.from("contact-files").upload(path, blob, { contentType: "application/pdf" });
  check(!up, `staff can upload files${up ? ": " + up.message : ""}`);
  const { error: badPath } = await asStaff.storage.from("contact-files").upload(`elsewhere/${stamp}.pdf`, blob);
  check(!!badPath, "uploads outside contacts/<id>/ are rejected");
  const { data: signed } = await asViewer.storage.from("contact-files").createSignedUrl(path, 60);
  check(!!signed?.signedUrl, "viewer can open files through a signed URL");
  const { data: pub } = anon.storage.from("contact-files").getPublicUrl(path);
  const res = await fetch(pub.publicUrl);
  check(res.status >= 400, `public URL does not work (HTTP ${res.status})`);
  const { error: anonSign } = await anon.storage.from("contact-files").createSignedUrl(path, 60);
  check(!!anonSign, "anonymous users cannot sign URLs");
  const { error: rm } = await asStaff.storage.from("contact-files").remove([path]);
  const { data: still } = await asViewer.storage.from("contact-files").createSignedUrl(path, 60);
  check(!!still?.signedUrl, `files cannot be deleted by staff (${rm ? "error" : "no-op"})`);
}

{
  // last admin protection
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (admins.length === 1) {
    const { error } = await asAdmin.from("profiles").update({ role: "staff" }).eq("id", admins[0].id);
    check(!!error, "the last admin cannot be demoted");
  }
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll security checks passed.");
process.exit(failures ? 1 : 0);
