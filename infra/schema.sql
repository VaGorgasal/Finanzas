-- Ejecutar en un proyecto Supabase exclusivo de Brújula, nunca sobre otra app.
create table if not exists public.user_backups (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (octet_length(payload::text) <= 2000000),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.user_backups enable row level security;
revoke all on public.user_backups from anon;
grant select, insert, update, delete on public.user_backups to authenticated;
create policy "own backups read" on public.user_backups for select to authenticated using ((select auth.uid())=user_id);
create policy "own backups create" on public.user_backups for insert to authenticated with check ((select auth.uid())=user_id);
create policy "own backups update" on public.user_backups for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own backups delete" on public.user_backups for delete to authenticated using ((select auth.uid())=user_id);

create schema if not exists private;
create table if not exists private.service_usage (
 bucket text not null, service text not null, day date not null, used int not null default 0,
 primary key(bucket,service,day)
);
alter table private.service_usage enable row level security;
revoke all on schema private from public,anon,authenticated;
revoke all on private.service_usage from public,anon,authenticated;
-- Only the server service role may choose a user or consume quota.
create or replace function public.consume_service_quota(p_user uuid,p_kind text)
returns boolean language plpgsql security definer set search_path='' as $$
declare lim int; global_lim int; count_global int; count_user int; d date := (now() at time zone 'utc')::date;
begin
 if p_user is null or p_kind not in ('market','news','ai') then return false; end if;
 lim := case p_kind when 'ai' then 10 when 'news' then 10 else 15 end;
 global_lim := case p_kind when 'ai' then 100 when 'news' then 10 else 15 end;
 insert into private.service_usage(bucket,service,day) values ('global',p_kind,d) on conflict do nothing;
 select used into count_global from private.service_usage where bucket='global' and service=p_kind and day=d for update;
 if count_global>=global_lim then return false; end if;
 insert into private.service_usage(bucket,service,day) values (p_user::text,p_kind,d) on conflict do nothing;
 select used into count_user from private.service_usage where bucket=p_user::text and service=p_kind and day=d for update;
 if count_user>=lim then return false; end if;
 update private.service_usage set used=used+1 where bucket in ('global',p_user::text) and service=p_kind and day=d;
 return true;
end;
$$;
revoke all on function public.consume_service_quota(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_service_quota(uuid,text) to service_role;
