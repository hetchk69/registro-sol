// admin-colaboradores.js
// Pestaña "Colaboradores" del administrador: lista, búsqueda y exportación a CSV.
// Solo se llama con sesión de admin (RLS: únicamente el admin puede leer colaboradores).

const AdminColaboradores = (() => {
  let rows = [];
  let deptoById = {};
  let muniById = {};
  let institucionById = {};

  // PostgREST devuelve como máximo 1000 filas por consulta: se pagina.
  async function fetchAll() {
    const pageSize = 1000;
    const all = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await window.db
        .from('colaboradores')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, from + pageSize - 1);
      if (error) throw error;
      all.push(...data);
      if (data.length < pageSize) return all;
    }
  }

  async function load() {
    const countEl = document.getElementById('colab-count');
    countEl.textContent = 'Cargando...';
    try {
      const [colabs, deptos, munis, instituciones] = await Promise.all([
        fetchAll(),
        window.db.from('hn_departamentos').select('id, nombre'),
        window.db.from('hn_municipios').select('id, nombre'),
        window.db.from('instituciones').select('id, nombre'),
      ]);
      if (deptos.error) throw deptos.error;
      if (munis.error) throw munis.error;
      if (instituciones.error) throw instituciones.error;
      rows = colabs;
      deptoById = Object.fromEntries(deptos.data.map((d) => [d.id, d.nombre]));
      muniById = Object.fromEntries(munis.data.map((m) => [m.id, m.nombre]));
      institucionById = Object.fromEntries(instituciones.data.map((i) => [i.id, i.nombre]));
      render();
    } catch (err) {
      console.error(err);
      rows = [];
      render();
      countEl.textContent = 'No se pudieron cargar los colaboradores.';
    }
  }

  function searchText(r) {
    return [r.apellidos, r.nombres, r.numero_documento, r.email, r.cargo, institucionById[r.institucion_id]]
      .join(' ')
      .toLowerCase();
  }

  function render() {
    const q = document.getElementById('colab-search').value.trim().toLowerCase();
    const institucionId = document.getElementById('colab-filter-institucion').value;
    const tbody = document.getElementById('colab-table-body');
    tbody.textContent = '';

    let filtered = q ? rows.filter((r) => searchText(r).includes(q)) : rows;
    if (institucionId) filtered = filtered.filter((r) => String(r.institucion_id) === institucionId);
    document.getElementById('colab-count').textContent =
      `${filtered.length} de ${rows.length} colaboradores`;

    for (const r of filtered) {
      const tr = document.createElement('tr');
      const cells = [
        `${r.apellidos}, ${r.nombres}`,
        `${r.tipo_documento}: ${r.numero_documento}`,
        r.cargo,
        institucionById[r.institucion_id] || '—',
        `${r.email} · ${r.movil || '—'}`,
        `${muniById[r.municipio_id] || '—'}, ${deptoById[r.departamento_id] || '—'}`,
        new Date(r.created_at).toLocaleDateString('es-HN'),
      ];
      for (const value of cells) {
        const td = document.createElement('td');
        td.textContent = value; // nunca innerHTML: son datos enviados por terceros
        tr.appendChild(td);
      }

      const tdActions = document.createElement('td');
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.textContent = 'Ver ficha';
      viewBtn.className = 'btn-secondary';
      viewBtn.addEventListener('click', () => toggleDetail(r, tr, viewBtn));
      tdActions.appendChild(viewBtn);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    }
  }

  function toggleDetail(r, tr, btn) {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('detail-row')) {
      next.remove();
      btn.textContent = 'Ver ficha';
      return;
    }
    // Cierra cualquier otra ficha abierta: solo una visible a la vez.
    document.querySelectorAll('#colab-table-body .detail-row').forEach((row) => row.remove());
    document
      .querySelectorAll('#colab-table-body .btn-secondary')
      .forEach((b) => b.textContent === 'Ocultar ficha' && (b.textContent = 'Ver ficha'));

    btn.textContent = 'Ocultar ficha';

    const detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';
    const td = document.createElement('td');
    td.colSpan = 8;

    const fields = [
      ['Apellidos', r.apellidos],
      ['Nombres', r.nombres],
      ['Tipo de documento', r.tipo_documento],
      ['Número de documento', r.numero_documento],
      ['Fecha de nacimiento', r.fecha_nacimiento],
      ['Sexo', r.sexo || '—'],
      ['Cargo', r.cargo],
      ['Área', r.area],
      ['Institución', institucionById[r.institucion_id] || '—'],
      ['Correo electrónico', r.email],
      ['Móvil', r.movil || '—'],
      ['Teléfono fijo', r.fijo || '—'],
      ['Calle', r.calle || '—'],
      ['Provincia (departamento)', deptoById[r.departamento_id] || '—'],
      ['Ciudad (municipio)', muniById[r.municipio_id] || '—'],
      ['Barrio', r.barrio || '—'],
      ['Código postal', r.codigo_postal || '—'],
      ['Registrado', new Date(r.created_at).toLocaleString('es-HN')],
    ];
    for (const [label, value] of fields) {
      const item = document.createElement('div');
      item.className = 'question';
      const q = document.createElement('div');
      q.className = 'question-text';
      q.textContent = label;
      const v = document.createElement('div');
      v.className = 'question-purpose';
      v.textContent = value; // nunca innerHTML: son datos enviados por terceros
      item.append(q, v);
      td.appendChild(item);
    }

    detailTr.appendChild(td);
    tr.after(detailTr);
  }

  // Los datos vienen de un formulario público: se neutralizan las "fórmulas"
  // de Excel (= + - @) anteponiendo un apóstrofo, salvo teléfonos tipo +504...
  function csvCell(value) {
    let str = String(value ?? '');
    const looksLikePhone = /^[+-]?[0-9][0-9 ()-]*$/.test(str);
    if (/^[=@\t\r]/.test(str) || (/^[+-]/.test(str) && !looksLikePhone)) str = "'" + str;
    if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  }

  async function exportCsv() {
    const header = [
      'apellidos', 'nombres', 'tipo_documento', 'numero_documento', 'fecha_nacimiento',
      'sexo', 'cargo', 'area', 'institucion', 'email', 'movil', 'fijo', 'calle',
      'departamento', 'municipio', 'barrio', 'codigo_postal', 'registrado',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.apellidos, r.nombres, r.tipo_documento, r.numero_documento, r.fecha_nacimiento,
          r.sexo, r.cargo, r.area, institucionById[r.institucion_id], r.email, r.movil, r.fijo, r.calle,
          deptoById[r.departamento_id], muniById[r.municipio_id], r.barrio, r.codigo_postal,
          r.created_at,
        ]
          .map(csvCell)
          .join(',')
      );
    }
    // BOM para que Excel abra bien los acentos.
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colaboradores_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { load, render, exportCsv, csvCell };
})();

window.AdminColaboradores = AdminColaboradores;
