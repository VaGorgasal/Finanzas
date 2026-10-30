begin;
insert into auth.users(id,aud,role,email) values ('7f73f31b-20e6-43b4-9201-f9a378fb0001','authenticated','authenticated','brujula-test-a@example.invalid'),('7f73f31b-20e6-43b4-9201-f9a378fb0002','authenticated','authenticated','brujula-test-b@example.invalid');
insert into public.user_backups(user_id,payload) values ('7f73f31b-20e6-43b4-9201-f9a378fb0001','{"test":true}'),('7f73f31b-20e6-43b4-9201-f9a378fb0002','{"test":true}');
set local role authenticated;
select set_config('request.jwt.claim.sub','7f73f31b-20e6-43b4-9201-f9a378fb0001',true);
do $$ declare n int; begin
 n := (select count(*) from public.user_backups); if n<>1 then raise exception 'RLS read isolation failed'; end if;
 update public.user_backups set revision=2 where user_id='7f73f31b-20e6-43b4-9201-f9a378fb0002'; get diagnostics n=row_count; if n<>0 then raise exception 'RLS foreign update failed'; end if;
 update public.user_backups set revision=2 where user_id='7f73f31b-20e6-43b4-9201-f9a378fb0001'; get diagnostics n=row_count; if n<>1 then raise exception 'RLS own update failed'; end if;
 begin insert into public.user_backups(user_id,payload) values ('7f73f31b-20e6-43b4-9201-f9a378fb0002','{}'); raise exception 'RLS insert allowed'; exception when insufficient_privilege then null; end;
 if has_function_privilege('authenticated','public.consume_service_quota(uuid,text)','EXECUTE') then raise exception 'Quota callable by user'; end if;
end $$;
reset role;set local role anon;
do $$ begin begin perform count(*) from public.user_backups; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end; end $$;
reset role;set local role service_role;
do $$ declare allowed boolean; begin for i in 1..11 loop allowed:=public.consume_service_quota('7f73f31b-20e6-43b4-9201-f9a378fb0001','ai'); if allowed is distinct from (i<=10) then raise exception 'Quota limit failed'; end if;end loop;end $$;
reset role;rollback;
select 'OK: aislamiento de lectura/escritura, acceso anónimo bloqueado y cuota 10/11. Pruebas revertidas.' as comprobacion;
