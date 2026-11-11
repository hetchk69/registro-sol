-- 005_colaboradores.sql
-- Registro público de colaboradores (módulo aparte del levantamiento).
-- anon solo puede insertar; solo el admin lee, edita o borra.

create table hn_departamentos (
  id smallint primary key,
  nombre text not null unique
);

create table hn_municipios (
  id integer generated always as identity primary key,
  departamento_id smallint not null references hn_departamentos(id),
  nombre text not null,
  unique (departamento_id, nombre),
  unique (id, departamento_id)
);

create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  apellidos text not null check (char_length(btrim(apellidos)) between 1 and 100),
  nombres text not null check (char_length(btrim(nombres)) between 1 and 100),
  tipo_documento text not null
    check (tipo_documento in ('Identidad', 'Pasaporte', 'Carnet de residente')),
  numero_documento text not null check (char_length(btrim(numero_documento)) between 1 and 30),
  fecha_nacimiento date not null check (fecha_nacimiento >= date '1900-01-01'),
  sexo text check (sexo is null or sexo in ('Masculino', 'Femenino')),
  cargo text not null check (char_length(btrim(cargo)) between 1 and 150),
  area text not null check (char_length(btrim(area)) between 1 and 150),
  institucion text not null check (char_length(btrim(institucion)) between 1 and 150),
  email text not null
    check (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  movil text not null check (char_length(btrim(movil)) between 1 and 25),
  fijo text check (fijo is null or char_length(fijo) <= 25),
  calle text not null check (char_length(btrim(calle)) between 1 and 200),
  departamento_id smallint not null,
  municipio_id integer not null,
  barrio text not null check (char_length(btrim(barrio)) between 1 and 100),
  codigo_postal text check (codigo_postal is null or char_length(codigo_postal) <= 15),
  created_at timestamptz not null default now(),
  foreign key (municipio_id, departamento_id) references hn_municipios (id, departamento_id)
);

-- Documento único sin importar guiones, espacios ni mayúsculas
-- ("0801-1990-12345" y "0801199012345" son el mismo documento).
create unique index colaboradores_documento_uk
  on colaboradores (lower(regexp_replace(numero_documento, '[^0-9A-Za-z]', '', 'g')));

-- RLS
alter table hn_departamentos enable row level security;
alter table hn_municipios enable row level security;
alter table colaboradores enable row level security;

create policy hn_departamentos_select on hn_departamentos
  for select to anon, authenticated using (true);
create policy hn_municipios_select on hn_municipios
  for select to anon, authenticated using (true);
create policy hn_departamentos_admin_write on hn_departamentos
  for all to authenticated
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy hn_municipios_admin_write on hn_municipios
  for all to authenticated
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

create policy colaboradores_insert on colaboradores
  for insert to anon, authenticated with check (true);
create policy colaboradores_admin_all on colaboradores
  for all to authenticated
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

-- Defensa en profundidad: aunque falle una política, anon no tiene permiso
-- de lectura/edición/borrado sobre colaboradores, ni de escritura en catálogos.
revoke all on colaboradores from anon;
grant insert on colaboradores to anon;
revoke all on hn_departamentos from anon;
revoke all on hn_municipios from anon;
grant select on hn_departamentos to anon;
grant select on hn_municipios to anon;
