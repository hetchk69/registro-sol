-- 006_instituciones.sql
-- Catálogo de instituciones: cada institución tiene su propio link de registro
-- (registro.html?institucion=<slug>). anon solo lee; solo el admin administra.
-- colaboradores.institucion (texto libre) pasa a institucion_id (clave foránea).

create table instituciones (
  id integer generated always as identity primary key,
  nombre text not null unique check (char_length(btrim(nombre)) between 1 and 150),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table instituciones enable row level security;

create policy instituciones_select on instituciones
  for select to anon, authenticated using (true);
create policy instituciones_admin_write on instituciones
  for all to authenticated
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

revoke all on instituciones from anon;
grant select on instituciones to anon;

-- No hay datos reales todavía: se reemplaza la columna de texto libre por la FK.
alter table colaboradores drop column institucion;
alter table colaboradores add column institucion_id integer not null references instituciones(id);
