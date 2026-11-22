-- Bound per-account storage growth and allow an owner to remove one selected save.
-- All write paths remain security-definer RPCs; browser clients get no table DELETE grant.
create or replace function public.touchline_save(slot uuid, expected integer, label text, snapshot jsonb)
returns table(slot_id uuid, saved_revision integer)
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid();
begin
  if who is null then raise insufficient_privilege; end if;
  -- Serialize a user’s slot-count check against their other create/delete RPCs.
  perform pg_advisory_xact_lock(hashtext(who::text));
  if slot is null and expected = 0 then
    if (select count(*) from public.touchline_careers where owner_id=who) >= 10 then
      raise exception using errcode='54000', message='Cloud save limit reached (10 slots). Delete a save before uploading another.';
    end if;
    return query insert into public.touchline_careers(owner_id,name,payload) values(who,label,snapshot) returning id,revision;
  else
    return query update public.touchline_careers set payload=snapshot,revision=revision+1,updated_at=now()
      where id=slot and owner_id=who and revision=expected returning id,revision;
  end if;
end $$;
revoke all on function public.touchline_save(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.touchline_save(uuid,integer,text,jsonb) to authenticated;

create function public.touchline_delete(slot uuid, expected integer)
returns table(deleted_id uuid)
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid();
begin
  if who is null then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtext(who::text));
  return query delete from public.touchline_careers
    where id=slot and owner_id=who and revision=expected returning id;
end $$;
revoke all on function public.touchline_delete(uuid,integer) from public,anon,authenticated;
grant execute on function public.touchline_delete(uuid,integer) to authenticated;
