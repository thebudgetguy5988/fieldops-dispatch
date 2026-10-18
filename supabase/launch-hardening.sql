
-- Keep privileged implementations out of the exposed API schema.
do $move$
declare item record; definition text;
begin
 for item in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) as args,pg_get_function_arguments(p.oid) as fullargs,pg_get_function_result(p.oid) as result
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('create_organization','create_employee_invite','accept_employee_invite','change_employee_role','list_employee_invites','revoke_employee_invite')
 loop
  definition:=pg_get_functiondef(item.oid);
  definition:=replace(definition,'FUNCTION public.'||item.proname||'(', 'FUNCTION private.'||item.proname||'(');
  if item.proname='create_employee_invite' then
   definition:=regexp_replace(definition, 'normalized !~ ''[^'']+''', 'normalized !~ ''^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$''');
  end if;
  if item.proname='change_employee_role' then
   definition:=replace(definition, 'if p_role not in', 'perform 1 from public.organizations where id=org for update; if p_role not in');
  end if;
  execute definition;
  execute format('revoke all on function private.%I(%s) from public, anon',item.proname,item.args);
  execute format('grant execute on function private.%I(%s) to authenticated, service_role',item.proname,item.args);
 end loop;
end $move$;
create or replace function public.create_organization(p_name text) returns uuid language sql security invoker set search_path='' as $f$ select private.create_organization(p_name) $f$;
create or replace function public.create_employee_invite(p_email text,p_role text default 'technician') returns text language sql security invoker set search_path='' as $f$ select private.create_employee_invite(p_email,p_role) $f$;
create or replace function public.accept_employee_invite(p_token text) returns uuid language sql security invoker set search_path='' as $f$ select private.accept_employee_invite(p_token) $f$;
create or replace function public.change_employee_role(p_user uuid,p_role text) returns boolean language sql security invoker set search_path='' as $f$ select private.change_employee_role(p_user,p_role) $f$;
create or replace function public.list_employee_invites() returns table(id uuid,email text,role text,created_at timestamptz,expires_at timestamptz,accepted_at timestamptz,revoked_at timestamptz) language sql stable security invoker set search_path='' as $f$ select * from private.list_employee_invites() $f$;
create or replace function public.revoke_employee_invite(p_id uuid) returns boolean language sql security invoker set search_path='' as $f$ select private.revoke_employee_invite(p_id) $f$;
alter policy "org location dispatch read" on public.technician_locations using (private.is_org_dispatcher(organization_id) or (technician_id=(select auth.uid()) and private.in_org(organization_id)));
-- Serialize retries using the client operation id before checking or changing balances.
do $idempotent$
declare definition text;
begin
 select pg_get_functiondef('private.transact_part(uuid,uuid,uuid,uuid,text,integer,text)'::regprocedure) into definition;
 definition:=replace(definition, 'select * into existing from public.part_transactions where id=op_id;',
 'perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(op_id::text, 23)); select * into existing from public.part_transactions where id=op_id;');
 execute definition;
end $idempotent$;
notify pgrst,'reload schema';

