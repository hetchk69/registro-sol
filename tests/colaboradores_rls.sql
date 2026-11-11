-- tests/colaboradores_rls.sql
-- Autoverificable: lanza excepción "FALLO: ..." si algo no se comporta como se espera.
-- Correr DESPUÉS de aplicar 005_colaboradores.sql. Termina en rollback.
begin;

insert into hn_departamentos (id, nombre) values (901, 'ZZ Prueba A'), (902, 'ZZ Prueba B');
insert into hn_municipios (departamento_id, nombre)
  values (901, 'ZZ Muni A'), (902, 'ZZ Muni B');

set local role anon;

do $$
declare
  m_a integer := (select id from hn_municipios where nombre = 'ZZ Muni A');
  m_b integer := (select id from hn_municipios where nombre = 'ZZ Muni B');
begin
  -- 1. anon puede insertar un registro válido
  insert into colaboradores
    (apellidos, nombres, tipo_documento, numero_documento, fecha_nacimiento,
     cargo, area, institucion, email, movil, calle, departamento_id, municipio_id, barrio)
  values
    ('ZZ Prueba', 'Uno', 'Identidad', '0801-1990-00001', '1990-01-01',
     'c', 'a', 'i', 'zz@example.com', '99999999', 'calle 1', 901, m_a, 'barrio');

  -- 2. documento repetido (otro formato) es rechazado
  begin
    insert into colaboradores
      (apellidos, nombres, tipo_documento, numero_documento, fecha_nacimiento,
       cargo, area, institucion, email, movil, calle, departamento_id, municipio_id, barrio)
    values
      ('ZZ Prueba', 'Dos', 'Identidad', '08011990 00001', '1991-02-02',
       'c', 'a', 'i', 'zz2@example.com', '99999998', 'calle 2', 901, m_a, 'barrio');
    raise exception 'FALLO: se aceptó un documento duplicado';
  exception when unique_violation then null;
  end;

  -- 3. municipio que no pertenece al departamento es rechazado
  begin
    insert into colaboradores
      (apellidos, nombres, tipo_documento, numero_documento, fecha_nacimiento,
       cargo, area, institucion, email, movil, calle, departamento_id, municipio_id, barrio)
    values
      ('ZZ Prueba', 'Tres', 'Identidad', 'ZZ-3', '1992-03-03',
       'c', 'a', 'i', 'zz3@example.com', '99999997', 'calle 3', 901, m_b, 'barrio');
    raise exception 'FALLO: se aceptó un municipio de otro departamento';
  exception when foreign_key_violation then null;
  end;

  -- 4. correo inválido es rechazado
  begin
    insert into colaboradores
      (apellidos, nombres, tipo_documento, numero_documento, fecha_nacimiento,
       cargo, area, institucion, email, movil, calle, departamento_id, municipio_id, barrio)
    values
      ('ZZ Prueba', 'Cuatro', 'Identidad', 'ZZ-4', '1993-04-04',
       'c', 'a', 'i', 'no-es-correo', '99999996', 'calle 4', 901, m_a, 'barrio');
    raise exception 'FALLO: se aceptó un correo inválido';
  exception when check_violation then null;
  end;

  -- 5. sexo fuera de la lista es rechazado
  begin
    insert into colaboradores
      (apellidos, nombres, tipo_documento, numero_documento, fecha_nacimiento, sexo,
       cargo, area, institucion, email, movil, calle, departamento_id, municipio_id, barrio)
    values
      ('ZZ Prueba', 'Cinco', 'Identidad', 'ZZ-5', '1994-05-05', 'Otro',
       'c', 'a', 'i', 'zz5@example.com', '99999995', 'calle 5', 901, m_a, 'barrio');
    raise exception 'FALLO: se aceptó un sexo no permitido';
  exception when check_violation then null;
  end;

  -- 6. anon NO puede leer, editar ni borrar colaboradores
  begin
    perform 1 from colaboradores;
    raise exception 'FALLO: anon pudo leer colaboradores';
  exception when insufficient_privilege then null;
  end;
  begin
    update colaboradores set nombres = 'X';
    raise exception 'FALLO: anon pudo editar colaboradores';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from colaboradores;
    raise exception 'FALLO: anon pudo borrar colaboradores';
  exception when insufficient_privilege then null;
  end;

  -- 7. anon puede leer los catálogos pero no escribirlos
  perform 1 from hn_departamentos;
  begin
    insert into hn_departamentos (id, nombre) values (903, 'ZZ Intruso');
    raise exception 'FALLO: anon pudo escribir en el catálogo';
  exception when insufficient_privilege then null;
  end;

  raise notice 'OK: todas las pruebas de colaboradores pasaron';
end $$;

rollback;
