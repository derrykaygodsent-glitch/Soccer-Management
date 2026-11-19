-- Clients may read their own slots. The RPC is the only granted write path.
create table public.touchline_careers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 64),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 4000000)
);
alter table public.touchline_careers enable row level security;
revoke all on public.touchline_careers from public, anon, authenticated;
grant select on public.touchline_careers to authenticated;
create policy own_slots on public.touchline_careers for select to authenticated using (owner_id = (select auth.uid()));
create index on public.touchline_careers(owner_id, updated_at desc);

create function public.touchline_save(slot uuid, expected integer, label text, snapshot jsonb)
returns table(slot_id uuid, saved_revision integer)
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid();
begin
  if who is null then raise insufficient_privilege; end if;
  if slot is null and expected = 0 then
    return query insert into public.touchline_careers(owner_id,name,payload) values(who,label,snapshot) returning id,revision;
  else
    return query update public.touchline_careers set payload=snapshot,revision=revision+1,updated_at=now()
      where id=slot and owner_id=who and revision=expected returning id,revision;
  end if;
end $$;
revoke all on function public.touchline_save(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.touchline_save(uuid,integer,text,jsonb) to authenticated;
