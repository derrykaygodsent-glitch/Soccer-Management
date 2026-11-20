create table public.meridian_players_v1(id text primary key,nation text not null,club text,name text not null,pos text not null,age smallint not null check(age between 16 and 40),num smallint not null,attrs jsonb not null);
alter table public.meridian_players_v1 enable row level security;
revoke all on public.meridian_players_v1 from public,anon,authenticated;
grant select on public.meridian_players_v1 to anon,authenticated;
create policy world_read on public.meridian_players_v1 for select to anon,authenticated using(true);
with countries(n,clubs) as (values
('Valdoria','Grandessa FC|Vesterholm Athletic|Ironhaven United|Millbrook Town|Redwick Rovers'),
('Estavelle','Real Castavelle|Bellmont City|Ardin Sporting|Westmere FC|Kingswell United'),
('Caldria','San Aurelio FC|Port Azure Sporting|Maravilla CF|Sorello Calcio|Eastwick United'),
('Monteluce','Bellacosta FC|Monteverde Athletic|San Vito Calcio|Valmere United|Rocaforte FC'),
('Zandora','Kintaba United|Densari FC|Mavelle Sporting|Koroba City|East Kintaba FC'),
('Nembala','Asenga Stars|Bolani United|Kofira FC|Tembwe Athletic|Nambara City'),
('Kordane','Belako FC|Doruma United|Kessan Athletic|Ariba Sporting|Port Kord FC'),
('Tavira','Mavuno City|Luthala FC|Ndera United|Kasumbi Stars|Tavik Athletic'),
('Norvaska','Vesterholm FK|Frostvik United|Northhaven FC|Eldermere Athletic|Skarstad IF'),
('Westmark','Alverton City|Westborough Town|Ashbourne FC|Wexford Rovers|Kingsport United'),
('Dravonia','Novigrad FK|Draxford United|Keldon FC|Bracken Athletic|Ostrel City'),
('Ravensk','Arkenford FC|Dunhaven United|Coldstream Athletic|Ravensby FC|Hallowick Town'),
('Azmara','Kaishen FC|Lingdao United|Shenzena Athletic|Yushiro City|Port Kai FC'),
('Veloria','Tanshiro FC|Nakamura United|Hoshima Athletic|Kurei City|East Tanshiro FC'),
('Sorelia','Nakamori FC|Senda United|Maruko Athletic|Yatami City|Solport FC'),
('Kintaro','Port Senga FC|Kambara United|Natsuki Athletic|Belora City|Kintai FC'),
('Meridia','Santa Espera FC|Rio Blanco Athletic|San Mateo United|Cordillera FC|Las Palmas Sporting'),
('Solmera','Nueva Sol FC|Puerto Sol Athletic|Valverde United|Santa Rosa FC|Mirador Sporting'),
('Bellvaria','San Cordoba FC|Estrella United|Monte Azul Athletic|San Lucas FC|Belavista Sporting'),
('Orvessa','Puerto Real FC|San Marcos United|Villa Norte Athletic|Costa Brava FC|El Dorado Sporting')
), teams as(select n,c from countries cross join lateral unnest(array_append(string_to_array(clubs,'|'),null::text)) c), base as(select n,c,i,'m1:'||coalesce(c,n||':trial')||':'||i id,(string_to_array('GK GK DC DC FB FB DM CM CM AM W W ST ST GK DC FB DM CM AM W ST FB DC',' '))[i] pos from teams cross join generate_series(1,24)i), seeds as(select *,decode(md5(id),'hex') h from base), skills as(select *,6+get_byte(h,0)%8 ability from seeds)
insert into public.meridian_players_v1 select id,n,c,(string_to_array('Ari Matteo Ivo Jonas Sol Emil Rafael Kofi Nico Tari Felix Ren Dario Toma Haru Malik Luca Soren Javi Theo Amar Niko Kaito Adan',' '))[1+get_byte(h,1)%24]||' '||(string_to_array('Varela Soro Lind Vale Koroma Miro Tanaka Daro Mendes Keita Silva Renard Mensa Rivas Arden Novak Elsen Costa Vico Ito Marin Neri Alves Kone Larne Salvi Ibarra Bell Kael Okoro Serra Dalen',' '))[1+get_byte(h,2)%32],pos,17+get_byte(h,3)%18,i,(select jsonb_object_agg(k,greatest(1,least(20,ability+get_byte(decode(md5(id||k),'hex'),0)%7-3+case when k in ('handling','reflexes') then case when pos='GK' then 4 else -5 end when pos='ST' and k in ('shooting','positioning') or pos in ('DC','DM') and k in ('tackling','positioning') or pos in ('CM','AM') and k in ('passing','composure') or pos in ('FB','W') and k in ('pace','dribbling') then 3 else 0 end))) from unnest(string_to_array('pace passing shooting tackling dribbling positioning aggression workRate stamina handling reflexes composure throwing throwPower freeKicks penalties',' ')) k) from skills;
create index meridian_players_v1_registration on public.meridian_players_v1(nation,club);
