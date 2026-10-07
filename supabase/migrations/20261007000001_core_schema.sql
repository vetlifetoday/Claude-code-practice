-- =============================================================================
-- VETLIFE CRM — core schema
-- Tables, roles, Row Level Security, audit log, soft delete, storage bucket.
--
-- NOTE: by design this schema contains NO health, medical, or diagnosis fields.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'staff', 'viewer');
create type public.contact_kind as enum ('person', 'organization');
create type public.interaction_type as enum ('note', 'call', 'email', 'meeting', 'event', 'other');

-- -----------------------------------------------------------------------------
-- Profiles (one row per login; mirrors auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.app_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so they can read profiles / MFA factors
-- without recursing through RLS. A user who has enrolled MFA must be signed
-- in at AAL2 (code entered) before any of these return true.
-- -----------------------------------------------------------------------------
create function public.mfa_satisfied()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

create function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active
    and public.mfa_satisfied();
$$;

create function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_app_role() is not null; $$;

create function public.can_edit()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('admin', 'staff'), false); $$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() = 'admin', false); $$;

-- -----------------------------------------------------------------------------
-- Lookup tables: categories and subcategories (editable from the Admin screen)
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text,
  -- Stable key used by the app for special behavior (e.g. linking family to a
  -- veteran). Admins can rename a category without breaking that behavior.
  system_key  text unique,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
create unique index categories_name_key on public.categories (lower(name));

create table public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  unique (id, category_id)
);
create unique index subcategories_name_key on public.subcategories (category_id, lower(name));

-- -----------------------------------------------------------------------------
-- Contacts: every person or organization
-- -----------------------------------------------------------------------------
create table public.contacts (
  id               uuid primary key default gen_random_uuid(),
  kind             public.contact_kind not null default 'person',
  first_name       text,
  last_name        text,
  email            text,
  phone            text,
  address          text,
  city             text,
  state            text,
  zip              text,
  company          text,
  title            text,
  years_of_service integer check (years_of_service between 0 and 80),
  photo_path       text,
  notes            text,
  -- Military Family member -> the veteran they belong to
  veteran_id       uuid references public.contacts (id) on delete set null,
  -- Person -> the Business / Organization contact they work for
  organization_id  uuid references public.contacts (id) on delete set null,
  created_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles (id) on delete set null,
  archived_at      timestamptz,
  archived_by      uuid references public.profiles (id) on delete set null,

  display_name text generated always as (
    case
      when kind = 'organization' then coalesce(nullif(btrim(company), ''), '(unnamed organization)')
      else coalesce(
        nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
        nullif(btrim(company), ''),
        '(unnamed)')
    end
  ) stored,
  search_text text generated always as (
    lower(
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' || coalesce(company, '') || ' ' ||
      coalesce(phone, '')
    )
  ) stored,

  constraint contacts_has_name check (
    coalesce(btrim(first_name), '') <> ''
    or coalesce(btrim(last_name), '') <> ''
    or coalesce(btrim(company), '') <> ''
  ),
  constraint contacts_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contacts_no_self_veteran check (veteran_id is null or veteran_id <> id),
  constraint contacts_no_self_org check (organization_id is null or organization_id <> id)
);

create index contacts_search_trgm on public.contacts using gin (search_text extensions.gin_trgm_ops);
create index contacts_email_idx on public.contacts (lower(email)) where email is not null;
create index contacts_name_zip_idx on public.contacts (lower(first_name), lower(last_name), zip);
create index contacts_state_city_idx on public.contacts (upper(state), lower(city));
create index contacts_created_idx on public.contacts (created_at desc);
create index contacts_archived_idx on public.contacts (archived_at);
create index contacts_veteran_idx on public.contacts (veteran_id) where veteran_id is not null;
create index contacts_org_idx on public.contacts (organization_id) where organization_id is not null;

-- Category tags (many per contact)
create table public.contact_categories (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references public.contacts (id) on delete cascade,
  category_id    uuid not null references public.categories (id) on delete restrict,
  subcategory_id uuid,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  -- the subcategory must belong to the chosen category
  foreign key (subcategory_id, category_id) references public.subcategories (id, category_id),
  constraint contact_categories_unique unique nulls not distinct (contact_id, category_id, subcategory_id)
);
create index contact_categories_category_idx on public.contact_categories (category_id, subcategory_id);

-- Notes / interaction timeline
create table public.interactions (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts (id) on delete cascade,
  type        public.interaction_type not null default 'note',
  occurred_on date not null default current_date,
  summary     text not null check (char_length(btrim(summary)) between 1 and 10000),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles (id) on delete set null
);
create index interactions_contact_idx on public.interactions (contact_id, occurred_on desc);
create index interactions_created_idx on public.interactions (created_at desc);

-- Uploaded documents (files live in the private "contact-files" bucket)
create table public.contact_documents (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts (id) on delete cascade,
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles (id) on delete set null,
  archived_at  timestamptz,
  archived_by  uuid references public.profiles (id) on delete set null
);
create index contact_documents_contact_idx on public.contact_documents (contact_id);

-- Audit log (written only by triggers / security-definer functions)
create table public.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_email text,
  action      text not null,  -- create | update | archive | restore | delete | export | import | invite
  entity_type text not null,  -- table name, or 'contacts_export' etc.
  entity_id   uuid,
  contact_id  uuid,
  summary     text,
  changes     jsonb
);
create index audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_contact_idx on public.audit_log (contact_id, occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Stamps created_* / updated_* and protects archive columns from direct edits.
-- Archiving and restoring go through public.set_archived() only.
create function public.stamp_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  has_archive boolean := TG_TABLE_NAME in ('contacts', 'interactions', 'contact_documents');
begin
  if TG_OP = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.updated_by := auth.uid();
    end if;
    if has_archive and coalesce(current_setting('vetlife.archive_op', true), '') <> 'on' then
      new.archived_at := null;
      new.archived_by := null;
    end if;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    if has_archive and coalesce(current_setting('vetlife.archive_op', true), '') <> 'on' then
      new.archived_at := old.archived_at;
      new.archived_by := old.archived_by;
    end if;
  end if;
  return new;
end;
$$;

create trigger stamp_row before insert or update on public.categories
  for each row execute function public.stamp_row();
create trigger stamp_row before insert or update on public.subcategories
  for each row execute function public.stamp_row();
create trigger stamp_row before insert or update on public.contacts
  for each row execute function public.stamp_row();
create trigger stamp_row before insert or update on public.interactions
  for each row execute function public.stamp_row();
create trigger stamp_row before insert or update on public.contact_documents
  for each row execute function public.stamp_row();

create function public.stamp_tag()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.created_at := now();
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;
create trigger stamp_tag before insert on public.contact_categories
  for each row execute function public.stamp_tag();

create function public.stamp_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  new.id := old.id;
  -- Never allow the last active admin to be demoted or deactivated.
  if (old.role = 'admin' and old.is_active)
     and (new.role <> 'admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles p
       where p.id <> old.id and p.role = 'admin' and p.is_active
     ) then
    raise exception 'At least one active administrator is required.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger stamp_profile before update on public.profiles
  for each row execute function public.stamp_profile();

-- Generic audit trigger: records who created / changed / archived / restored.
create function public.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_action text;
  v_changes jsonb;
  v_entity_id uuid;
  v_contact_id uuid;
  v_ignored text[] := array['updated_at', 'updated_by', 'search_text', 'display_name', 'created_at', 'created_by'];
begin
  if TG_OP = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := v_new;
    v_action := 'create';
    v_changes := v_new - v_ignored;
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;
    select jsonb_object_agg(n.key, jsonb_build_object('from', v_old -> n.key, 'to', n.value))
      into v_changes
      from jsonb_each(v_new) n
      where (v_old -> n.key) is distinct from n.value
        and n.key <> all (v_ignored);
    if v_changes is null then
      return null;  -- nothing meaningful changed
    end if;
    if (v_old ->> 'archived_at') is null and (v_new ->> 'archived_at') is not null then
      v_action := 'archive';
    elsif (v_old ->> 'archived_at') is not null and (v_new ->> 'archived_at') is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
  else
    v_old := to_jsonb(old);
    v_row := v_old;
    v_action := 'delete';
    v_changes := v_old;
  end if;

  v_entity_id := (v_row ->> 'id')::uuid;
  v_contact_id := case
    when TG_TABLE_NAME = 'contacts' then v_entity_id
    else (v_row ->> 'contact_id')::uuid
  end;

  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, contact_id, summary, changes)
  values (
    auth.uid(),
    (select p.email from public.profiles p where p.id = auth.uid()),
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_contact_id,
    coalesce(v_row ->> 'display_name', v_row ->> 'name', v_row ->> 'file_name', v_row ->> 'email',
             left(v_row ->> 'summary', 120)),
    v_changes
  );
  return null;
end;
$$;

create trigger audit_row after insert or update or delete on public.contacts
  for each row execute function public.audit_row();
create trigger audit_row after insert or delete on public.contact_categories
  for each row execute function public.audit_row();
create trigger audit_row after insert or update or delete on public.interactions
  for each row execute function public.audit_row();
create trigger audit_row after insert or update or delete on public.contact_documents
  for each row execute function public.audit_row();
create trigger audit_row after insert or update or delete on public.categories
  for each row execute function public.audit_row();
create trigger audit_row after insert or update or delete on public.subcategories
  for each row execute function public.audit_row();
create trigger audit_row after insert or update on public.profiles
  for each row execute function public.audit_row();

-- Create a profile whenever an auth user is created (invite or dashboard).
-- The very first user becomes the administrator so setup needs no SQL.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when exists (select 1 from public.profiles) then 'viewer'::public.app_role
         else 'admin'::public.app_role end
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- =============================================================================
-- Row Level Security
-- No DELETE policies exist on any table: nothing can be permanently deleted
-- from the app. (Removing a category tag from a contact is the one exception —
-- it is an edit of the contact and is audited.)
-- =============================================================================
alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.subcategories      enable row level security;
alter table public.contacts           enable row level security;
alter table public.contact_categories enable row level security;
alter table public.interactions       enable row level security;
alter table public.contact_documents  enable row level security;
alter table public.audit_log          enable row level security;

-- profiles
create policy "profiles: members read" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_member()));
create policy "profiles: admins update" on public.profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- categories / subcategories
create policy "categories: members read" on public.categories
  for select to authenticated using ((select public.is_member()));
create policy "categories: admins insert" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "categories: admins update" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "subcategories: members read" on public.subcategories
  for select to authenticated using ((select public.is_member()));
create policy "subcategories: admins insert" on public.subcategories
  for insert to authenticated with check ((select public.is_admin()));
create policy "subcategories: admins update" on public.subcategories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- contacts (archived rows are visible to admins only)
create policy "contacts: members read" on public.contacts
  for select to authenticated
  using ((select public.is_member()) and (archived_at is null or (select public.is_admin())));
create policy "contacts: editors insert" on public.contacts
  for insert to authenticated with check ((select public.can_edit()));
create policy "contacts: editors update" on public.contacts
  for update to authenticated
  using ((select public.can_edit()) and archived_at is null)
  with check ((select public.can_edit()));

-- contact_categories
create policy "tags: members read" on public.contact_categories
  for select to authenticated using ((select public.is_member()));
create policy "tags: editors insert" on public.contact_categories
  for insert to authenticated with check ((select public.can_edit()));
create policy "tags: editors delete" on public.contact_categories
  for delete to authenticated using ((select public.can_edit()));

-- interactions
create policy "interactions: members read" on public.interactions
  for select to authenticated
  using ((select public.is_member()) and (archived_at is null or (select public.is_admin())));
create policy "interactions: editors insert" on public.interactions
  for insert to authenticated with check ((select public.can_edit()));
create policy "interactions: editors update" on public.interactions
  for update to authenticated
  using ((select public.can_edit()) and archived_at is null)
  with check ((select public.can_edit()));

-- contact_documents
create policy "documents: members read" on public.contact_documents
  for select to authenticated
  using ((select public.is_member()) and (archived_at is null or (select public.is_admin())));
create policy "documents: editors insert" on public.contact_documents
  for insert to authenticated with check ((select public.can_edit()));
create policy "documents: editors update" on public.contact_documents
  for update to authenticated
  using ((select public.can_edit()) and archived_at is null)
  with check ((select public.can_edit()));

-- audit_log: admins read; nobody writes directly
create policy "audit: admins read" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;

-- =============================================================================
-- Functions called by the app
-- =============================================================================

-- Archive (soft delete) or restore a record.
--   contacts:              archive = admin, restore = admin
--   interactions/documents: archive = admin or staff, restore = admin
create function public.set_archived(p_entity text, p_id uuid, p_archive boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not p_archive and not public.is_admin() then
    raise exception 'Only administrators can restore archived records' using errcode = '42501';
  end if;
  if p_archive and p_entity = 'contact' and not public.is_admin() then
    raise exception 'Only administrators can archive contacts' using errcode = '42501';
  end if;
  if p_archive and not public.can_edit() then
    raise exception 'You do not have permission to archive records' using errcode = '42501';
  end if;

  perform set_config('vetlife.archive_op', 'on', true);

  if p_entity = 'contact' then
    update public.contacts
       set archived_at = case when p_archive then now() end,
           archived_by = case when p_archive then auth.uid() end
     where id = p_id and (archived_at is null) = p_archive;
  elsif p_entity = 'interaction' then
    update public.interactions
       set archived_at = case when p_archive then now() end,
           archived_by = case when p_archive then auth.uid() end
     where id = p_id and (archived_at is null) = p_archive;
  elsif p_entity = 'document' then
    update public.contact_documents
       set archived_at = case when p_archive then now() end,
           archived_by = case when p_archive then auth.uid() end
     where id = p_id and (archived_at is null) = p_archive;
  else
    raise exception 'Unknown record type %', p_entity;
  end if;

  if not found then
    raise exception 'Record not found or already %', case when p_archive then 'archived' else 'active' end
      using errcode = 'P0002';
  end if;

  perform set_config('vetlife.archive_op', 'off', true);
end;
$$;

-- Search used by the contact list and CSV export. SECURITY INVOKER, so RLS
-- still decides what the caller can see. Sorting and paging are applied by
-- the caller (PostgREST .order() / .range()).
create function public.search_contacts(
  p_query          text default null,
  p_category_id    uuid default null,
  p_subcategory_id uuid default null,
  p_state          text default null,
  p_city           text default null,
  p_archived       boolean default false
)
returns setof public.contacts
language sql stable security invoker set search_path = ''
as $$
  select c.*
  from public.contacts c
  where (case when p_archived then c.archived_at is not null else c.archived_at is null end)
    and (
      coalesce(btrim(p_query), '') = ''
      or c.search_text like '%' || replace(replace(replace(lower(btrim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
    and (coalesce(btrim(p_state), '') = '' or upper(btrim(c.state)) = upper(btrim(p_state)))
    and (coalesce(btrim(p_city), '') = '' or lower(btrim(c.city)) = lower(btrim(p_city)))
    and (
      p_category_id is null
      or exists (
        select 1 from public.contact_categories cc
        where cc.contact_id = c.id
          and cc.category_id = p_category_id
          and (p_subcategory_id is null or cc.subcategory_id = p_subcategory_id)
      )
    )
    and (
      p_subcategory_id is null
      or exists (
        select 1 from public.contact_categories cc
        where cc.contact_id = c.id and cc.subcategory_id = p_subcategory_id
      )
    );
$$;

-- Distinct states / cities for the filter dropdowns.
create function public.contact_locations()
returns table (state text, city text)
language sql stable security invoker set search_path = ''
as $$
  select distinct upper(btrim(c.state)) as state, initcap(btrim(c.city)) as city
  from public.contacts c
  where c.archived_at is null and coalesce(btrim(c.state), '') <> ''
  order by 1, 2;
$$;

-- Contact counts per category (subcategory_id null) and per subcategory.
create function public.category_counts()
returns table (category_id uuid, subcategory_id uuid, contact_count bigint)
language sql stable security invoker set search_path = ''
as $$
  select cc.category_id, null::uuid, count(distinct cc.contact_id)
  from public.contact_categories cc
  join public.contacts c on c.id = cc.contact_id and c.archived_at is null
  group by cc.category_id
  union all
  select cc.category_id, cc.subcategory_id, count(distinct cc.contact_id)
  from public.contact_categories cc
  join public.contacts c on c.id = cc.contact_id and c.archived_at is null
  where cc.subcategory_id is not null
  group by cc.category_id, cc.subcategory_id;
$$;

-- Likely duplicates: same email, or same first + last name + zip.
-- SECURITY DEFINER so archived matches are also reported (only id/name/reason
-- are returned).
create function public.find_possible_duplicates(
  p_email      text,
  p_first_name text,
  p_last_name  text,
  p_zip        text,
  p_exclude_id uuid default null
)
returns table (id uuid, display_name text, email text, city text, state text, zip text, reason text, is_archived boolean)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.display_name, c.email, c.city, c.state, c.zip,
         case
           when coalesce(btrim(p_email), '') <> '' and lower(btrim(c.email)) = lower(btrim(p_email))
             then 'Same email'
           else 'Same name and ZIP'
         end as reason,
         c.archived_at is not null as is_archived
  from public.contacts c
  where public.is_member()
    and (p_exclude_id is null or c.id <> p_exclude_id)
    and (
      (coalesce(btrim(p_email), '') <> '' and lower(btrim(c.email)) = lower(btrim(p_email)))
      or (
        coalesce(btrim(p_first_name), '') <> '' and coalesce(btrim(p_last_name), '') <> ''
        and coalesce(btrim(p_zip), '') <> ''
        and lower(btrim(c.first_name)) = lower(btrim(p_first_name))
        and lower(btrim(c.last_name)) = lower(btrim(p_last_name))
        and left(btrim(c.zip), 5) = left(btrim(p_zip), 5)
      )
    )
  limit 10;
$$;

-- Record an export / import (or other app-level event) in the audit log.
create function public.log_event(p_action text, p_entity_type text, p_summary text, p_details jsonb default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_action not in ('export', 'import', 'invite', 'view_document') then
    raise exception 'Unsupported audit action %', p_action;
  end if;
  insert into public.audit_log (actor_id, actor_email, action, entity_type, summary, changes)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()),
          p_action, p_entity_type, left(p_summary, 500), p_details);
end;
$$;

-- Lets any signed-in user change their own display name (and nothing else).
create function public.update_my_name(p_full_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.profiles
     set full_name = nullif(left(btrim(p_full_name), 120), '')
   where id = auth.uid();
end;
$$;

grant execute on function public.update_my_name(text) to authenticated;

grant execute on function public.is_member(), public.can_edit(), public.is_admin(),
  public.current_app_role(), public.mfa_satisfied(),
  public.set_archived(text, uuid, boolean),
  public.search_contacts(text, uuid, uuid, text, text, boolean),
  public.contact_locations(),
  public.category_counts(),
  public.find_possible_duplicates(text, text, text, text, uuid),
  public.log_event(text, text, text, jsonb)
to authenticated;

-- =============================================================================
-- Storage: private bucket for photos/logos and documents
-- Paths: contacts/<contact_id>/photo/<file>  and  contacts/<contact_id>/docs/<file>
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-files', 'contact-files', false, 26214400,
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set public = false;

create policy "contact-files: members read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contact-files'
    and (select public.is_member())
    and exists (
      select 1 from public.contacts c
      where c.id::text = (storage.foldername(name))[2]
    )
  );

create policy "contact-files: editors upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contact-files'
    and (select public.can_edit())
    and (storage.foldername(name))[1] = 'contacts'
    and exists (
      select 1 from public.contacts c
      where c.id::text = (storage.foldername(name))[2] and c.archived_at is null
    )
  );

-- =============================================================================
-- Default categories and subcategories
-- =============================================================================
insert into public.categories (name, system_key, sort_order) values
  ('Veteran',                 'veteran',          10),
  ('Military Family',         'military_family',  20),
  ('Volunteer',               'volunteer',        30),
  ('Donor',                   'donor',            40),
  ('Board Member',            'board_member',     50),
  ('Business / Organization', 'business',         60),
  ('Prospect',                'prospect',         70),
  ('Media Contact',           'media',            80),
  ('Exhibitor',               'exhibitor',        90),
  ('Sponsor',                 'sponsor',         100),
  ('Participant',             'participant',     110);

insert into public.subcategories (category_id, name, sort_order)
select c.id, s.name, s.sort_order
from (values
  ('veteran', 'Army', 10), ('veteran', 'Navy', 20), ('veteran', 'National Guard/Reserve', 30),
  ('veteran', 'Coast Guard', 40), ('veteran', 'Marine Corps', 50), ('veteran', 'Air Force', 60),
  ('veteran', 'Space Force', 70),
  ('military_family', 'Spouse', 10), ('military_family', 'Child', 20),
  ('donor', 'One Time', 10), ('donor', 'Monthly', 20),
  ('sponsor', 'Battle Buddy', 10), ('sponsor', 'Radio Show', 20), ('sponsor', 'Event', 30),
  ('sponsor', 'General', 40),
  ('participant', 'Boat Raffle 2026', 10), ('participant', 'Vet Fest 2026', 20),
  ('participant', 'Golf Event 2026', 30), ('participant', 'Harvest for Heroes 2026', 40)
) as s(key, name, sort_order)
join public.categories c on c.system_key = s.key;
