// admin-instituciones.js
// Pestaña "Instituciones" del administrador: catálogo de instituciones,
// cada una con su propio link de registro (registro.html?institucion=<slug>).
// Solo el admin puede leer/escribir esta tabla (ver policy instituciones_admin_write).

const AdminInstituciones = (() => {
  let rows = [];
  let slugEditedByUser = false;

  function registroUrl(slug) {
    const base = window.location.href.replace(/index\.html.*$/, '').replace(/\/$/, '');
    return `${base}/registro.html?institucion=${encodeURIComponent(slug)}`;
  }

  function slugify(nombre) {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function fetchAll() {
    const { data, error } = await window.db
      .from('instituciones')
      .select('id, nombre, slug')
      .order('nombre');
    if (error) throw error;
    return data;
  }

  async function load() {
    try {
      rows = await fetchAll();
      render();
      fillFilter();
    } catch (err) {
      console.error(err);
      rows = [];
      render();
    }
  }

  function render() {
    const tbody = document.getElementById('instituciones-table-body');
    tbody.textContent = '';
    for (const r of rows) {
      const tr = document.createElement('tr');

      const tdNombre = document.createElement('td');
      tdNombre.textContent = r.nombre;
      tr.appendChild(tdNombre);

      const tdSlug = document.createElement('td');
      tdSlug.textContent = r.slug;
      tr.appendChild(tdSlug);

      const tdLink = document.createElement('td');
      tdLink.textContent = registroUrl(r.slug);
      tr.appendChild(tdLink);

      const tdAccion = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary';
      btn.textContent = 'Copiar link';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(registroUrl(r.slug));
          btn.textContent = 'Copiado';
        } catch {
          btn.textContent = 'No se pudo copiar';
        }
        setTimeout(() => {
          btn.textContent = 'Copiar link';
        }, 1500);
      });
      tdAccion.appendChild(btn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-link';
      delBtn.textContent = 'Borrar';
      delBtn.addEventListener('click', () => removeInstitucion(r, delBtn));
      tdAccion.appendChild(delBtn);

      tr.appendChild(tdAccion);

      tbody.appendChild(tr);
    }
  }

  // La pestaña "Colaboradores" filtra por institución con esta misma lista.
  function fillFilter() {
    const sel = document.getElementById('colab-filter-institucion');
    if (!sel) return;
    const current = sel.value;
    sel.textContent = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'Todas las instituciones';
    sel.appendChild(allOpt);
    for (const r of rows) {
      const opt = document.createElement('option');
      opt.value = String(r.id);
      opt.textContent = r.nombre;
      sel.appendChild(opt);
    }
    sel.value = current;
  }

  async function removeInstitucion(r, btn) {
    if (!confirm(`¿Borrar la institución "${r.nombre}"? Esto no se puede deshacer.`)) return;
    btn.disabled = true;
    const { error } = await window.db.from('instituciones').delete().eq('id', r.id);
    if (error) {
      alert(
        error.code === '23503'
          ? 'No se puede borrar: ya hay colaboradores registrados con esta institución.'
          : 'No se pudo borrar la institución.'
      );
      btn.disabled = false;
      return;
    }
    await load();
  }

  async function addInstitucion({ nombre, slug }) {
    const errorEl = document.getElementById('instituciones-add-error');
    errorEl.textContent = '';
    const { error } = await window.db.from('instituciones').insert({ nombre, slug });
    if (error) {
      errorEl.textContent =
        error.code === '23505'
          ? 'Ya existe una institución con ese nombre o slug.'
          : error.code === '23514'
            ? 'El slug solo puede tener minúsculas, números y guiones (ej: ministerio-salud).'
            : 'No se pudo agregar la institución.';
      return false;
    }
    await load();
    return true;
  }

  function wireForm() {
    const nombreEl = document.getElementById('instituciones-add-nombre');
    const slugEl = document.getElementById('instituciones-add-slug');
    nombreEl.addEventListener('input', () => {
      if (!slugEditedByUser) slugEl.value = slugify(nombreEl.value);
    });
    slugEl.addEventListener('input', () => {
      slugEditedByUser = true;
    });

    document.getElementById('instituciones-add-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = await addInstitucion({ nombre: nombreEl.value.trim(), slug: slugEl.value.trim() });
      if (ok) {
        e.target.reset();
        slugEditedByUser = false;
      }
    });
  }

  return { load, wireForm };
})();

window.AdminInstituciones = AdminInstituciones;
