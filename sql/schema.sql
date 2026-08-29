-- ============================================================
--  POKEHDEX — esquema de Supabase
--  Ejecutar entero en el editor SQL del proyecto (SQL Editor > New query).
--  Es idempotente: se puede volver a lanzar sin romper nada.
-- ============================================================

-- ---------- Perfiles ----------
-- Una fila por persona. El id es el mismo que el de auth.users.

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  handle       text unique not null,
  display_name text,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is 'Perfil publico de cada entrenador';

-- Codigos para intercambiar. Se añaden asi para poder relanzar el archivo
-- entero sobre una base que ya existe sin que falle.
alter table public.profiles add column if not exists friend_code  text;
alter table public.profiles add column if not exists champions_id text;

-- Al registrarse alguien, se le crea el perfil solo.
-- El handle sale del correo y se limpia; si choca, se le pega un sufijo.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base   text;
  intento text;
  n      int := 0;
begin
  base := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if base = '' then base := 'entrenador'; end if;
  intento := base;

  while exists (select 1 from public.profiles where handle = intento) loop
    n := n + 1;
    intento := base || n::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, intento, intento);

  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();


-- ---------- Juego elegido por region ----------
-- Define el color de acento de esa region para ese perfil.
-- game_id es una clave del catalogo de data/games.js, no se valida aqui
-- a proposito: asi se pueden añadir juegos nuevos sin migrar la base.

create table if not exists public.region_games (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  generation smallint not null check (generation between 1 and 20),
  game_id    text not null,
  primary key (user_id, generation)
);


-- ---------- Capturas ----------
-- Una fila por Pokemon que se tiene. dex_id es el numero nacional, o el id de
-- PokeAPI (10000 en adelante) cuando es una forma regional.
-- Normal y variocolor son filas distintas.

create table if not exists public.catches (
  user_id uuid not null references public.profiles(id) on delete cascade,
  dex_id  integer not null,
  shiny   boolean not null default false,
  primary key (user_id, dex_id, shiny)
);

create index if not exists catches_por_dex on public.catches (dex_id, shiny);


-- ---------- Equipo campeon ----------

create table if not exists public.teams (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  generation smallint not null check (generation between 1 and 20),
  slot       smallint not null check (slot between 1 and 6),
  dex_id     integer not null,
  species    text not null,
  nickname   text,
  gender     text check (gender in ('m', 'f', 'n')),
  form       text,
  ball       text,
  shiny      boolean not null default false,
  primary key (user_id, generation, slot)
);


-- ---------- Favoritos (Salon de la Fama) ----------

create table if not exists public.favourites (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  position smallint not null,
  dex_id   integer not null,
  species  text not null,
  nickname text,
  gender   text check (gender in ('m', 'f', 'n')),
  form     text,
  ball     text,
  shiny    boolean not null default false,
  primary key (user_id, position)
);


-- ============================================================
--  Seguridad a nivel de fila
--  Todo el mundo con cuenta puede LEER a todo el mundo (hace falta para
--  comparar y cuadrar intercambios). Cada cual solo ESCRIBE lo suyo.
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.region_games enable row level security;
alter table public.catches      enable row level security;
alter table public.teams        enable row level security;
alter table public.favourites   enable row level security;

-- Lectura para cualquiera que haya entrado
drop policy if exists leer_perfiles on public.profiles;
create policy leer_perfiles on public.profiles
  for select to authenticated using (true);

drop policy if exists leer_juegos on public.region_games;
create policy leer_juegos on public.region_games
  for select to authenticated using (true);

drop policy if exists leer_capturas on public.catches;
create policy leer_capturas on public.catches
  for select to authenticated using (true);

drop policy if exists leer_equipos on public.teams;
create policy leer_equipos on public.teams
  for select to authenticated using (true);

drop policy if exists leer_favoritos on public.favourites;
create policy leer_favoritos on public.favourites
  for select to authenticated using (true);

-- Escritura solo sobre lo propio
drop policy if exists editar_mi_perfil on public.profiles;
create policy editar_mi_perfil on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists escribir_mis_juegos on public.region_games;
create policy escribir_mis_juegos on public.region_games
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists escribir_mis_capturas on public.catches;
create policy escribir_mis_capturas on public.catches
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists escribir_mi_equipo on public.teams;
create policy escribir_mi_equipo on public.teams
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists escribir_mis_favoritos on public.favourites;
create policy escribir_mis_favoritos on public.favourites
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================
--  Vista de apoyo para cuadrar intercambios
--  Para un par de perfiles, dice que tiene uno que al otro le falta.
--  Se consulta con: select * from public.trade_matches('mi-uuid', 'su-uuid');
-- ============================================================

create or replace function public.trade_matches(yo uuid, otro uuid)
returns table (dex_id integer, shiny boolean, direccion text)
language sql
stable
security invoker
as $$
  -- Lo que el otro tiene y a mi me falta
  select c.dex_id, c.shiny, 'el_me_da'::text
  from public.catches c
  where c.user_id = otro
    and not exists (
      select 1 from public.catches m
      where m.user_id = yo and m.dex_id = c.dex_id and m.shiny = c.shiny
    )
  union all
  -- Lo que yo tengo y a el le falta
  select c.dex_id, c.shiny, 'yo_le_doy'::text
  from public.catches c
  where c.user_id = yo
    and not exists (
      select 1 from public.catches s
      where s.user_id = otro and s.dex_id = c.dex_id and s.shiny = c.shiny
    );
$$;
