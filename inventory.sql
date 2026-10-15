alter table public.jobs add column if not exists contact_name text not null default '', add column if not exists customer_phone text not null default '', add column if not exists customer_email text not null default '';
create table public.parts(id uuid primary key default gen_random_uuid(),sku text not null unique check(length(trim(sku))>0),name text not null check(length(trim(name))>0),unit text not null default 'each',created_at timestamptz not null default now());
create table public.van_stock(technician_id uuid not null references public.profiles(id),part_id uuid not null references public.parts(id),quantity integer not null default 0 check(quantity>=0),primary key(technician_id,part_id));
create table public.part_transactions(id uuid primary key,technician_id uuid not null references public.profiles(id),part_id uuid not null references public.parts(id),job_id uuid references public.jobs(id) on delete restrict,kind text not null check(kind in ('restock','use','return','remove')),quantity integer not null check(quantity>0 and quantity<=1000000),note text not null default '',created_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
create index on public.part_transactions(job_id);
create index on public.part_transactions(technician_id,created_at desc);
alter table public.parts enable row level security;
alter table public.van_stock enable row level security;
alter table public.part_transactions enable row level security;
create policy parts_read on public.parts for select to authenticated using(true);
create policy parts_create on public.parts for insert to authenticated with check(private.is_dispatcher());
create policy stock_read on public.van_stock for select to authenticated using(technician_id=auth.uid() or private.is_dispatcher());
create policy transaction_read on public.part_transactions for select to authenticated using(technician_id=auth.uid() or private.is_dispatcher());
grant select,insert on public.parts to authenticated;
grant select on public.van_stock,public.part_transactions to authenticated;
revoke insert,update,delete on public.van_stock,public.part_transactions from anon,authenticated;
create or replace function private.transact_part(op_id uuid,tech_id uuid,item_id uuid,order_id uuid,action text,qty integer,memo text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); dispatch boolean; existing public.part_transactions; balance integer; used integer; order_status text; assigned uuid;
begin
 if actor is null then raise exception 'Sign in required'; end if;
 dispatch:=private.is_dispatcher();
 if qty is null or qty<1 or qty>1000000 or action is null or action not in ('restock','use','return','remove') or op_id is null then raise exception 'Invalid transaction'; end if;
 if not exists(select 1 from public.profiles where id=tech_id and role='technician') then raise exception 'Select a technician van'; end if;
 if not exists(select 1 from public.parts where id=item_id) then raise exception 'Part not found'; end if;
 if action in ('restock','remove') then
  if not dispatch or order_id is not null then raise exception 'Only dispatch can adjust van stock'; end if;
 else
  select status,assigned_to into order_status,assigned from public.jobs where id=order_id for share;
  if not found or assigned is distinct from tech_id then raise exception 'Work order must be assigned to this van technician'; end if;
  if not dispatch and (tech_id<>actor or order_status<>'On site') then raise exception 'Technicians must be on site at their assigned work order'; end if;
 end if;
 insert into public.van_stock(technician_id,part_id) values(tech_id,item_id) on conflict do nothing;
 select quantity into balance from public.van_stock where technician_id=tech_id and part_id=item_id for update;
 select * into existing from public.part_transactions where id=op_id;
 if found then
  if existing.created_by=actor and existing.technician_id=tech_id and existing.part_id=item_id and existing.job_id is not distinct from order_id and existing.kind=action and existing.quantity=qty then return existing.id; end if;
  raise exception 'Transaction reference already used';
 end if;
 if action='return' then
  select coalesce(sum(case when kind='use' then quantity when kind='return' then -quantity else 0 end),0) into used from public.part_transactions where technician_id=tech_id and part_id=item_id and job_id=order_id;
  if qty>used then raise exception 'Return exceeds parts used on this work order'; end if;
 end if;
 if action in ('use','remove') and qty>balance then raise exception 'Insufficient van stock: % available',balance; end if;
 update public.van_stock set quantity=quantity+case when action in ('restock','return') then qty else -qty end where technician_id=tech_id and part_id=item_id;
 insert into public.part_transactions(id,technician_id,part_id,job_id,kind,quantity,note,created_by) values(op_id,tech_id,item_id,order_id,action,qty,left(coalesce(memo,''),2000),actor);
 return op_id;
end $$;
revoke all on function private.transact_part(uuid,uuid,uuid,uuid,text,integer,text) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.transact_part(uuid,uuid,uuid,uuid,text,integer,text) to authenticated;
create or replace function public.transact_part(op_id uuid,tech_id uuid,item_id uuid,order_id uuid,action text,qty integer,memo text default '') returns uuid language sql security invoker set search_path='' as $$select private.transact_part(op_id,tech_id,item_id,order_id,action,qty,memo)$$;
revoke all on function public.transact_part(uuid,uuid,uuid,uuid,text,integer,text) from public,anon;
grant execute on function public.transact_part(uuid,uuid,uuid,uuid,text,integer,text) to authenticated;
create table public.work_order_files(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs(id) on delete restrict,kind text not null check(kind in ('photo','signature')),path text not null unique,original_name text not null,signer_name text,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),check(kind<>'signature' or length(trim(signer_name))>0));
alter table public.work_order_files enable row level security;
create policy files_read on public.work_order_files for select to authenticated using(exists(select 1 from public.jobs j where j.id=job_id and (j.assigned_to=auth.uid() or private.is_dispatcher())));
create policy files_insert on public.work_order_files for insert to authenticated with check(created_by=auth.uid() and split_part(path,'/',1)=job_id::text and split_part(path,'/',2)=auth.uid()::text and exists(select 1 from public.jobs j where j.id=job_id and (private.is_dispatcher() or (j.assigned_to=auth.uid() and j.status='On site'))));
grant select,insert on public.work_order_files to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('work-order-evidence','work-order-evidence',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy evidence_read on storage.objects for select to authenticated using(bucket_id='work-order-evidence' and exists(select 1 from public.jobs j where j.id::text=split_part(name,'/',1) and (j.assigned_to=auth.uid() or private.is_dispatcher())));
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='work-order-evidence' and split_part(name,'/',2)=auth.uid()::text and exists(select 1 from public.jobs j where j.id::text=split_part(name,'/',1) and (private.is_dispatcher() or (j.assigned_to=auth.uid() and j.status='On site'))));
create policy evidence_cleanup on storage.objects for delete to authenticated using(bucket_id='work-order-evidence' and split_part(name,'/',2)=auth.uid()::text and not exists(select 1 from public.work_order_files f where f.path=name));

revoke insert on public.work_order_files from authenticated;
grant insert(job_id,kind,path,original_name,signer_name,created_by) on public.work_order_files to authenticated;
create index if not exists work_order_files_job_created_idx on public.work_order_files(job_id,created_at desc);
create index if not exists work_order_files_actor_idx on public.work_order_files(created_by);
create index if not exists part_transactions_part_idx on public.part_transactions(part_id);
create index if not exists part_transactions_actor_idx on public.part_transactions(created_by);
create index if not exists van_stock_part_idx on public.van_stock(part_id);
