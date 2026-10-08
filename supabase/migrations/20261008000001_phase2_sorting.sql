-- =============================================================================
-- VETLIFE CRM — Phase 2
-- Adds a sort key so the contact list sorts people by last name and
-- organizations by name in one column.
-- =============================================================================

alter table public.contacts add column sort_name text generated always as (
  lower(
    case
      when kind = 'organization' then coalesce(btrim(company), '')
      else coalesce(nullif(btrim(last_name), ''), nullif(btrim(first_name), ''), btrim(company), '')
           || ' ' || coalesce(btrim(first_name), '')
    end
  )
) stored;

create index contacts_sort_name_idx on public.contacts (sort_name);

-- Re-create the audit trigger function so the new computed column is not
-- reported as a "change" in the audit log.
create or replace function public.audit_row()
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
  v_ignored text[] := array['updated_at', 'updated_by', 'search_text', 'display_name', 'sort_name', 'created_at', 'created_by'];
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
