// registro.js
// Página pública de registro de colaboradores. Sin login: inserta como "anon".
// La base de datos (RLS + restricciones) es la que protege; aquí solo se valida
// para dar mensajes amables. Todo texto de la base se inserta con textContent.

const Registro = (() => {
  const $ = (id) => document.getElementById(id);
  let municipios = [];
  let institucionId = null;

  function showInvalidLink() {
    $('screen-registro').classList.add('hidden');
    $('screen-registro-invalido').classList.remove('hidden');
  }

  // Resuelve el slug de ?institucion=<slug> contra el catálogo. Devuelve
  // false (y muestra la pantalla de enlace inválido) si falta o no existe.
  async function resolveInstitucion() {
    const slug = new URLSearchParams(window.location.search).get('institucion');
    if (!slug) {
      showInvalidLink();
      return false;
    }
    const { data, error } = await window.db
      .from('instituciones')
      .select('id, nombre')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) {
      showInvalidLink();
      return false;
    }
    institucionId = data.id;
    $('reg-institucion').value = data.nombre;
    return true;
  }

  function addOption(select, value, text) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    select.appendChild(opt);
  }

  function byNombre(a, b) {
    return a.nombre.localeCompare(b.nombre, 'es');
  }

  async function loadCatalogs() {
    const [deptos, munis] = await Promise.all([
      window.db.from('hn_departamentos').select('id, nombre'),
      window.db.from('hn_municipios').select('id, departamento_id, nombre'),
    ]);
    if (deptos.error) throw deptos.error;
    if (munis.error) throw munis.error;
    municipios = munis.data;

    const sel = $('reg-departamento');
    sel.textContent = '';
    addOption(sel, '', 'Selecciona...');
    for (const d of deptos.data.slice().sort(byNombre)) addOption(sel, String(d.id), d.nombre);
  }

  function fillMunicipios() {
    const deptoId = Number($('reg-departamento').value);
    const sel = $('reg-municipio');
    sel.textContent = '';
    if (!deptoId) {
      sel.disabled = true;
      return;
    }
    addOption(sel, '', 'Selecciona...');
    for (const m of municipios.filter((x) => x.departamento_id === deptoId).sort(byNombre)) {
      addOption(sel, String(m.id), m.nombre);
    }
    sel.disabled = false;
  }

  const text = (id) => $(id).value.trim();
  const optional = (id) => text(id) || null;

  function buildPayload() {
    return {
      apellidos: text('reg-apellidos'),
      nombres: text('reg-nombres'),
      tipo_documento: $('reg-tipo-doc').value,
      numero_documento: text('reg-documento'),
      fecha_nacimiento: $('reg-nacimiento').value,
      sexo: $('reg-sexo').value || null,
      cargo: text('reg-cargo'),
      area: text('reg-area'),
      institucion_id: institucionId,
      email: text('reg-email'),
      movil: text('reg-movil'),
      fijo: optional('reg-fijo'),
      calle: text('reg-calle'),
      departamento_id: Number($('reg-departamento').value),
      municipio_id: Number($('reg-municipio').value),
      barrio: text('reg-barrio'),
      codigo_postal: optional('reg-postal'),
    };
  }

  async function submit(e) {
    e.preventDefault();
    const errorEl = $('registro-error');
    const btn = $('registro-submit');
    errorEl.textContent = '';
    btn.disabled = true;

    // insert sin .select(): anon no tiene permiso de lectura sobre colaboradores.
    const { error } = await window.db.from('colaboradores').insert(buildPayload());

    if (error) {
      errorEl.textContent =
        error.code === '23505'
          ? 'Este documento ya está registrado.'
          : 'No se pudo enviar el registro. Revisa los datos e intenta de nuevo.';
      btn.disabled = false;
      return;
    }

    $('screen-registro').classList.add('hidden');
    $('screen-gracias').classList.remove('hidden');
  }

  async function start() {
    const ok = await resolveInstitucion();
    if (!ok) return;

    $('reg-nacimiento').max = new Date().toISOString().slice(0, 10);
    $('reg-departamento').addEventListener('change', fillMunicipios);
    $('registro-form').addEventListener('submit', submit);
    try {
      await loadCatalogs();
    } catch (err) {
      console.error(err);
      $('registro-error').textContent = 'No se pudo cargar el formulario. Recarga la página.';
      $('registro-submit').disabled = true;
    }
  }

  return { start };
})();

document.addEventListener('DOMContentLoaded', () => Registro.start());
