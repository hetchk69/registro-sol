-- 007_domicilio_opcional.sql
-- Móvil y todo el domicilio (calle, provincia, ciudad, barrio) dejan de ser
-- obligatorios. Los checks existentes ya toleran NULL (una expresión con un
-- operando NULL evalúa a NULL, y Postgres acepta un CHECK en NULL como
-- válido), así que solo hace falta quitar la restricción NOT NULL.
-- La FK compuesta (municipio_id, departamento_id) también tolera NULL por
-- defecto (MATCH SIMPLE): si cualquiera de las dos es NULL, no se valida.

alter table colaboradores alter column movil drop not null;
alter table colaboradores alter column calle drop not null;
alter table colaboradores alter column departamento_id drop not null;
alter table colaboradores alter column municipio_id drop not null;
alter table colaboradores alter column barrio drop not null;

select 'migración 007 completa' as resultado;
