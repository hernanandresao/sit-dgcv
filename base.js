'use strict';

// ═══════════════════════════════════════════════════════════
//  SUPABASE — configuración
// ═══════════════════════════════════════════════════════════
var SUPA_PROJECT = 'https://furbzmtimdvsterqenff.supabase.co';
var SUPA_URL     = SUPA_PROJECT + '/rest/v1';
var SUPA_AUTH    = SUPA_PROJECT + '/auth/v1';
var SUPA_KEY     = 'sb_publishable_v7rjxV61uvkibEfTDo6gJA_78Rzsocm';

// JWT activo del usuario — se obtiene al login, se borra al logout
var currentToken = null;

// Headers dinámicos — usan JWT si existe, anon key si no
function buildHeaders(write) {
  var bearer = currentToken ? currentToken : SUPA_KEY;
  var h = {
    'apikey':        SUPA_KEY,
    'Authorization': 'Bearer ' + bearer,
    'Content-Type':  'application/json'
  };
  if (write) h['Prefer'] = 'return=minimal';
  return h;
}

// Generar UUID en el cliente
function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function supaGet(table, query) {
  return fetch(SUPA_URL + '/' + table + '?' + (query || ''), {
    method: 'GET', headers: buildHeaders(false)
  }).then(function(r) {
    return r.text().then(function(t) {
      if (!r.ok) throw new Error('GET ' + table + ' [' + r.status + ']: ' + t);
      return t ? JSON.parse(t) : [];
    });
  });
}

function supaPost(table, body) {
  return fetch(SUPA_URL + '/' + table, {
    method: 'POST', headers: buildHeaders(true), body: JSON.stringify(body)
  }).then(function(r) {
    return r.text().then(function(t) {
      if (!r.ok) throw new Error('POST ' + table + ' [' + r.status + ']: ' + t);
    });
  });
}

function supaPatch(table, id, body) {
  return fetch(SUPA_URL + '/' + table + '?id=eq.' + id, {
    method: 'PATCH', headers: buildHeaders(true), body: JSON.stringify(body)
  }).then(function(r) {
    return r.text().then(function(t) {
      if (!r.ok) throw new Error('PATCH ' + table + ' [' + r.status + ']: ' + t);
    });
  });
}

function supaDelete(table, id) {
  return fetch(SUPA_URL + '/' + table + '?id=eq.' + id, {
    method: 'DELETE', headers: buildHeaders(true)
  }).then(function(r) {
    if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
  });
}

// ═══════════════════════════════════════════════════════════
//  CONSTANTES DEL SISTEMA
// ═══════════════════════════════════════════════════════════
// USERS ya no está hardcodeado — se consulta Supabase en el login
var UNIDAD_NOMBRES = {
  admin: 'Administración General',
  rvp:   'Red Vial Pavimentada',
  rvnp:  'Red Vial No Pavimentada',
  rre:   'Respuesta Rápida a Emergencias',
  fext:  'Fondos Externos/Nacionales',
  fbcie: 'Fondos BCIE',
  ldv:   'Limpieza de Derecho de Vía'
};

var UNIDADES = {
  rvp:   { nombre:'Red Vial Pavimentada',            color:'#1268C4', bg:'#D6EBF9' },
  rvnp:  { nombre:'Red Vial No Pavimentada',         color:'#0D7A4E', bg:'#E3F5EE' },
  rre:   { nombre:'Respuesta Rápida a Emergencias',  color:'#C0392B', bg:'#FBEAEA' },
  fext:  { nombre:'Fondos Externos/Nacionales',      color:'#0A6E5C', bg:'#E0F5F0' },
  fbcie: { nombre:'Fondos BCIE',                      color:'#7A3500', bg:'#FFF0E0' },
  ldv:   { nombre:'Limpieza de Derecho de Vía',      color:'#B8620A', bg:'#FDF3E3' }
};

var ESTADOS = ['En Ejecución','En Proceso / Contratación','Suspendido','Terminado'];
var DEPTOS  = ['Atlántida','Choluteca','Colón','Comayagua','Copán','Cortés','El Paraíso',
               'Francisco Morazán','Gracias a Dios','Intibucá','Islas de la Bahía','La Paz',
               'Lempira','Ocotepeque','Olancho','Santa Bárbara','Valle','Yoro'];

var MUNICIPIOS = {
  "Atlántida": ["La Ceiba","Tela","El Porvenir","Esparta","Jutiapa","La Masica","San Francisco","Arizona"],
  "Choluteca": ["Choluteca","Apacilagua","Concepción de María","Duyure","El Corpus","El Triunfo","Marcovia","Morolica","Namasigüe","Orocuina","Pespire","San Antonio de Flores","San Isidro","San José","San Marcos de Colón","Santa Ana de Yusguare"],
  "Colón": ["Trujillo","Balfate","Iriona","Limón","Sabá","Santa Fe","Santa Rosa de Aguán","Sonaguera","Tocoa","Bonito Oriental"],
  "Comayagua": ["Comayagua","Ajuterique","El Rosario","Esquías","Humuya","La Libertad","Lamaní","La Trinidad","Lejamaní","Meámbar","Minas de Oro","Ojos de Agua","San Jerónimo","San José de Comayagua","San José del Potrero","San Luis","San Sebastián","Siguatepeque","Villa de San Antonio","Las Lajas","Taulabé"],
  "Copán": ["Santa Rosa de Copán","Cabañas","Concepción","Copán Ruinas","Corquín","Cucuyagua","Dolores","Dulce Nombre","El Paraíso","Florida","La Jigua","La Unión","Nueva Arcadia","San Agustín","San Antonio","San Jerónimo","San José","San Juan de Opoa","San Nicolás","San Pedro","Santa Rita","Trinidad de Copán","Veracruz"],
  "Cortés": ["San Pedro Sula","Choloma","La Lima","Naco","Omoa","Pimienta","Potrerillos","Puerto Cortés","San Antonio de Cortés","San Francisco de Yojoa","San Manuel","Santa Cruz de Yojoa","Villanueva"],
  "El Paraíso": ["Yuscarán","Alauca","Danlí","El Paraíso","Güinope","Jacaleapa","Liure","Morocelí","Oropolí","Potrerillos","San Antonio de Flores","San Lucas","San Matías","Soledad","Teupasenti","Texiguat","Vado Ancho","Yauyupe","Trojes"],
  "Francisco Morazán": ["Tegucigalpa","Alubarén","Cedros","Curarén","El Porvenir","Guaimaca","La Libertad","La Venta","Lepaterique","Maraita","Marale","Nueva Armenia","Ojojona","Orica","Reitoca","Sabanagrande","San Antonio de Oriente","San Buenaventura","San Ignacio","San Juan de Flores","San Miguelito","Santa Ana","Santa Lucía","Talanga","Tatumbla","Valle de Ángeles","Villa de San Francisco","Vallecillo"],
  "Gracias a Dios": ["Puerto Lempira","Brus Laguna","Ahuas","Juan Francisco Bulnes","Villeda Morales","Wampusirpe"],
  "Intibucá": ["La Esperanza","Camasca","Colomoncagua","Concepción","Dolores","Intibucá","Jesús de Otoro","Magdalena","Masaguara","San Antonio","San Francisco de Opalaca","San Isidro","San Juan","San Marcos de la Sierra","San Miguelito","Santa Lucía","Yamaranguila","San Francisco del Valle"],
  "Islas de la Bahía": ["Roatán","Guanaja","José Santos Guardiola","Utila"],
  "La Paz": ["La Paz","Aguanqueterique","Cabañas","Cane","Chinacla","Guajiquiro","Lauterique","Marcala","Mercedes de Oriente","Opatoro","San Antonio del Norte","San José","San Juan","San Pedro de Tutule","Santa Ana","Santa Elena","Santa María","Santiago de Puringla","Yarula"],
  "Lempira": ["Gracias","Belén","Candelaria","Cololaca","Erandique","Gualcince","Guarita","La Campa","La Iguala","Las Flores","La Unión","La Virtud","Lepaera","Mapulaca","Piraera","San Andrés","San Francisco","San Juan Guarita","San Manuel Colohete","San Rafael","San Sebastián","Santa Cruz","Talgua","Tambla","Tomalá","Valladolid","Virginia","San Marcos de Caiquín"],
  "Ocotepeque": ["Ocotepeque","Belén Gualcho","Concepción","Dolores Merendón","Fraternidad","La Encarnación","La Labor","Lucerna","Mercedes","San Fernando","San Francisco del Valle","San Jorge","San Marcos","Santa Fe","Sensenti","Sinuapa"],
  "Olancho": ["Juticalpa","Campamento","Catacamas","Concordia","Dulce Nombre de Culmí","El Rosario","Esquipulas del Norte","Gualaco","Guarizama","Guata","Guayape","Jano","La Unión","Mangulile","Manto","Salama","San Carlos","San Esteban","San Francisco de Becerra","San Francisco de la Paz","Santa María del Real","Silca","Yocón","Patuca"],
  "Santa Bárbara": ["Santa Bárbara","Arada","Atima","Azacualpa","Ceguaca","Chinda","Concepción del Norte","Concepción del Sur","Gualala","Ilama","Macuelizo","Naranjito","Nuevo Celilac","Petoa","Quimistán","San Francisco de Ojuera","San José de Colinas","San Luis","San Marcos","San Nicolás","San Pedro Zacapa","San Vicente Centenario","Santa Rita","Trinidad","Las Vegas","El Níspero"],
  "Valle": ["Nacaome","Alianza","Amapala","Aramecina","Caridad","Goascorán","Langue","San Francisco de Coray","San Lorenzo"],
  "Yoro": ["Yoro","Arenal","El Negrito","El Progreso","Jocon","Morazán","Olanchito","Santa Rita","Sulaco","Victoria","Yorito"]
};


// ═══════════════════════════════════════════════════════════
//  ESTADO DE LA APLICACIÓN
// ═══════════════════════════════════════════════════════════
var DB          = { rvp:[], rvnp:[], rre:[], fext:[], fbcie:[], ldv:[] };
var EMPRESAS    = { constructoras:[], supervisoras:[] }; // cache de empresas precalificadas
var currentUser = null;
var currentView = 'dashboard';
var editingId   = null;
var endosoCount = 0;
var pagoCount   = 0;
var dbOnline    = false;
var contratosSupervision = [];

// ═══════════════════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════════════════
function fmtL(n) {
  var v = parseFloat(n);
  if (isNaN(v)) return '—';
  return v.toLocaleString('es-HN', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function calcAvFin(p) {
  var mI = parseFloat(p.montoContratoInicial) || 0;
  var mM = parseFloat(p.montoModificacion) || 0;
  var vig = mM > 0 ? mM : mI;
  if (!vig) return 0;
  var dev = parseFloat(p.totalDevengado) || 0;
  return Math.min(parseFloat((dev / vig * 100).toFixed(2)), 100);
}

function fmtFecha(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('es-HN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch(e) { return iso; }
}

function saveLocalDB() {
  try { localStorage.setItem('sit_db', JSON.stringify(DB)); } catch(e) {}
}

function setDbStatus(online) {
  dbOnline = online;
  var dot = document.getElementById('syncDot');
  var lbl = document.getElementById('syncLabel');
  if (dot) dot.style.background = online ? '#4CAF50' : '#FFA726';
  if (lbl) lbl.textContent = online ? 'Base de datos conectada ✓' : 'Sin conexión — datos locales';
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = '<span>' + msg + '</span>';
  t.className = 'toast ' + (type || 'ok') + ' show';
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.remove('show'); }, 4000);
}

function showBanner(msg) {
  var b = document.getElementById('successBanner');
  if (!b) return;
  b.textContent = msg;
  b.classList.add('show');
  clearTimeout(b._t);
  b._t = setTimeout(function() { b.classList.remove('show'); }, 3500);
}

// ═══════════════════════════════════════════════════════════
//  SUPABASE — OPERACIONES
// ═══════════════════════════════════════════════════════════
function cargarProyectos() {
  return supaGet('proyectos', 'select=*&order=created_at.desc')
    .then(function(rows) {
      DB = { rvp:[], rvnp:[], rre:[], fext:[], fbcie:[], ldv:[] };
      (rows || []).forEach(function(row) {
        var proj = Object.assign({}, row.data || {}, { _sid: row.id, _unidad: row.unidad });
        if (DB[row.unidad]) DB[row.unidad].push(proj);
      });
      setDbStatus(true);
      saveLocalDB();
    })
    .catch(function(e) {
      console.warn('Supabase error:', e.message);
      try { DB = JSON.parse(localStorage.getItem('sit_db') || '{"rvp":[],"rvnp":[],"rre":[],"fext":[],"fbcie":[],"ldv":[]}'); }
      catch(ex) { DB = { rvp:[], rvnp:[], rre:[], fext:[], fbcie:[], ldv:[] }; }
      setDbStatus(false);
    });
}

function persistirProyecto(unidad, proj) {
  var mI  = parseFloat(proj.montoContratoInicial) || 0;
  var mM  = parseFloat(proj.montoModificacion) || 0;
  var vig = mM > 0 ? mM : mI;

  // Limpiar undefined del objeto antes de enviar a Supabase JSONB
  var dataLimpia = JSON.parse(JSON.stringify(proj));

  var row = {
    unidad:            unidad,
    proyecto:          proj.proyecto          || '',
    departamento:      proj.departamento       || null,
    estado:            proj.estado             || null,
    avance_fisico:     parseFloat(proj.avanceFisico)     || 0,
    avance_financiero: parseFloat(proj.avanceFinanciero) || 0,
    total_devengado:   parseFloat(proj.totalDevengado)   || 0,
    tipo_proyecto:     proj.tipoProyecto || 'construccion',
    monto_vigente:     vig,
    data:              dataLimpia
  };

  if (proj._sid) {
    // UPDATE
    return supaPatch('proyectos', proj._sid, row)
      .then(function() { return proj._sid; });
  } else {
    // INSERT — UUID generado en cliente, no dependemos de la respuesta
    var newId = genUUID();
    row.id = newId;
    return supaPost('proyectos', row)
      .then(function() { return newId; });
  }
}


// ═══════════════════════════════════════════════════════════
//  EMPRESAS PRECALIFICADAS
// ═══════════════════════════════════════════════════════════
function cargarEmpresas() {
  return supaGet('empresas', 'select=id,nombre,tipo,activa&activa=eq.true&order=nombre.asc')
    .then(function(rows) {
      EMPRESAS.constructoras = (rows||[]).filter(function(e){ return e.tipo==='constructora'||e.tipo==='ambas'; });
      EMPRESAS.supervisoras  = (rows||[]).filter(function(e){ return e.tipo==='supervisora' ||e.tipo==='ambas'; });
    })
    .catch(function(e) {
      console.warn('No se pudieron cargar empresas:', e.message);
    });
}

// Renders a datalist-backed input with autocomplete from empresas
function empresaInput(id, tipo, valor) {
  var listId = 'dl-'+id;
  var lista = tipo==='supervisora' ? EMPRESAS.supervisoras : EMPRESAS.constructoras;
  var opts  = lista.map(function(e){ return '<option value="'+e.nombre.replace(/"/g,'&quot;')+'">'; }).join('');
  return '<input type="text" id="'+id+'" value="'+valor+'" list="'+listId+'" placeholder="Escriba o seleccione..." autocomplete="off"/>'
    +'<datalist id="'+listId+'">'+opts+'</datalist>';
}

// ═══════════════════════════════════════════════════════════
//  CONTRATOS DE SUPERVISIÓN — helpers
// ═══════════════════════════════════════════════════════════
function cargarContratosSupervision() {
  contratosSupervision = [];
  Object.keys(DB).forEach(function(unidad) {
    (DB[unidad] || []).forEach(function(p) {
      if ((p.tipoProyecto || 'construccion') === 'supervision') {
        contratosSupervision.push(p);
      }
    });
  });
}

function buildTipoSelector() {
  return '<div style="padding:4px 0 0">' +
    '<p style="font-size:12px;color:var(--gris3);margin-bottom:18px;">Seleccione el tipo de registro que desea crear:</p>' +
    '<div class="tipo-selector">' +
      '<div class="tipo-card" onclick="selectTipoProyecto(\'construccion\')">' +
        '<div class="tipo-card-icon" style="background:var(--az6);color:var(--az2);">' +
          '<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><rect x="1" y="9" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="4" y="6" width="5" height="3" rx=".5" stroke="currentColor" stroke-width="1.1"/><line x1="9" y1="7.5" x2="14" y2="5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="14" cy="4.5" r="1" stroke="currentColor" stroke-width="1.1"/><line x1="1" y1="3" x2="15" y2="3" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-dasharray="2 1.5"/></svg>' +
        '</div>' +
        '<div class="tipo-card-title">Registro de Construcción</div>' +
        '<div class="tipo-card-desc">Contrato de obra, empresa constructora, supervisión asignada, garantías, avances y pagos</div>' +
        '<div class="tipo-card-arrow">→</div>' +
      '</div>' +
      '<div class="tipo-card" onclick="selectTipoProyecto(\'supervision\')">' +
        '<div class="tipo-card-icon" style="background:var(--verde-l);color:var(--verde);">' +
          '<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M1 14c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M11 7l2 2 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>' +
        '<div class="tipo-card-title">Registro de Supervisión</div>' +
        '<div class="tipo-card-desc">Contrato de supervisión, empresa supervisora, contratos que supervisa, garantías y pagos</div>' +
        '<div class="tipo-card-arrow">→</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function selectTipoProyecto(tipo) {
  editingId.tipo = tipo;
  var u = editingId.u;
  var p = {};
  var titulo = tipo === 'construccion' ? 'Nuevo Proyecto de Construcción' : 'Nuevo Contrato de Supervisión';
  document.getElementById('modalTitle').textContent = titulo + ' — ' + UNIDADES[u].nombre;
  var btnGuardar = document.querySelector('.modal-footer .btn-primary');
  if (btnGuardar) btnGuardar.style.display = '';
  function fv() { return ''; }
  var deptoOpts  = DEPTOS.map(function(d)  { return '<option>'+d+'</option>'; }).join('');
  var estadoOpts = ESTADOS.map(function(e) { return '<option>'+e+'</option>'; }).join('');
  if (tipo === 'supervision') {
    document.getElementById('modalBody').innerHTML = buildFormSupervision(u, p, fv, estadoOpts, deptoOpts);
  } else {
    document.getElementById('modalBody').innerHTML = buildFormConstruccion(u, p, fv, estadoOpts, deptoOpts);
    toggleSup('externa');
  }
  setTimeout(syncEstadoAvance, 0);
  addPago();
  updateFianzaOpts();
  recalcPagos();
}

function onSelectContratoSupervision(sel) {
  var sid    = sel.value;
  var infoEl = document.getElementById('sup-ext-info');
  if (!infoEl) return;
  if (!sid) { infoEl.style.display = 'none'; return; }
  var c = contratosSupervision.filter(function(s){ return s._sid === sid; })[0];
  if (!c) { infoEl.style.display = 'none'; return; }
  var unidLbl = UNIDADES[c._unidad] ? UNIDADES[c._unidad].nombre : c._unidad;
  infoEl.style.display = 'block';
  infoEl.innerHTML =
    '<div style="background:var(--az7);border:1px solid var(--az6);border-radius:6px;padding:9px 12px;font-size:11px;display:flex;flex-wrap:wrap;gap:12px;">' +
    '<span><span style="color:var(--gris3)">Empresa:</span> <strong>'+(c.supervisora||'—')+'</strong></span>' +
    '<span><span style="color:var(--gris3)">N° Contrato:</span> <strong style="font-family:var(--mono)">'+(c.noContratoSup||'—')+'</strong></span>' +
    '<span><span style="color:var(--gris3)">Unidad:</span> <strong>'+unidLbl+'</strong></span>' +
    (c.contratosSupervisa ? '<span style="width:100%"><span style="color:var(--gris3)">Contratos que supervisa:</span> '+c.contratosSupervisa+'</span>' : '') +
    '</div>';
}


// ═══════════════════════════════════════════════════════════
//  FORMULARIO CONSTRUCCIÓN
// ═══════════════════════════════════════════════════════════
function buildFormConstruccion(u, p, fv, estadoOpts, deptoOpts) {
  var tipoSup = p.tipoSupervision || 'externa';
  var haySupContratos = contratosSupervision.length > 0;
  var supOpts = '<option value="">— Seleccione contrato de supervisión —</option>';
  contratosSupervision.forEach(function(s) {
    var unidLbl = UNIDADES[s._unidad] ? UNIDADES[s._unidad].nombre.split(' ').slice(0,2).join(' ') : s._unidad;
    var lbl = (s.supervisora || '?') + ' — ' + (s.noContratoSup || 'S/N') + ' (' + unidLbl + ')';
    supOpts += '<option value="'+(s._sid||'')+'"'+(p.contratoSupervisionId===s._sid?' selected':'')+'>'+lbl+'</option>';
  });

  return (
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 6.5h5M4 4.5h5M4 8.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Datos Generales</div>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>N° Proceso de Contratación <span class="req">*</span></label><input type="text" id="f_nProceso" value="'+fv('nProceso')+'" placeholder="Ej. SITU-2025-001"/></div>' +
      '<div class="form-group"><label>Estado del Proyecto <span class="req">*</span></label><select id="f_estado" onchange="syncEstadoAvance()"><option value="">— Seleccione —</option>'+estadoOpts+'</select></div>' +
      '<div class="form-group span2"><label>Nombre del Proyecto <span class="req">*</span></label><input type="text" id="f_proyecto" value="'+fv('proyecto')+'" placeholder="Descripción completa del proyecto"/></div>' +
      '<div class="form-group span2"><label>Descripción / Alcance <span class="req">*</span></label><textarea id="f_descripcion" rows="2">'+fv('descripcion')+'</textarea></div>' +
    '</div>' +
    '<div class="form-grid g4" style="margin-top:10px">' +
      '<div class="form-group"><label>Longitud (km) <span class="req">*</span></label><input type="number" id="f_longitud" value="'+fv('longitud')+'" step="0.01" min="0" placeholder="0.00" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Beneficiarios</label><input type="number" id="f_beneficiarios" value="'+fv('beneficiarios')+'" min="0" step="1" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Empleados Directos</label><input type="number" id="f_empleadosDirectos" value="'+fv('empleadosDirectos')+'" min="0" step="1" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Empleados Indirectos</label><input type="number" id="f_empleadosIndirectos" value="'+fv('empleadosIndirectos')+'" min="0" step="1" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><path d="M6.5 1C4.567 1 3 2.567 3 4.5c0 2.5 3.5 7.5 3.5 7.5S10 7 10 4.5C10 2.567 8.433 1 6.5 1z" stroke="currentColor" stroke-width="1.2"/><circle cx="6.5" cy="4.5" r="1.2" stroke="currentColor" stroke-width="1.2"/></svg>Ubicación Geográfica</div>' +
    '<div class="form-grid g3">' +
      '<div class="form-group"><label>Departamento <span class="req">*</span></label><select id="f_departamento" onchange="actualizarMunicipios()"><option value="">— Seleccione —</option>'+deptoOpts+'</select></div>' +
      '<div class="form-group"><label>Municipio <span class="req">*</span></label><select id="f_municipio"><option value="">— Seleccione departamento —</option></select></div>' +
      '<div class="form-group"><label>Aldea / Barrio / Caserío <span class="req">*</span></label><input type="text" id="f_aldeaBarrio" value="'+fv('aldeaBarrio')+'"/></div>' +
      '<div class="form-group"><label>Latitud GPS <span class="req">*</span></label><input type="text" id="f_latitud" value="'+fv('latitud')+'" placeholder="14.081389" oninput="this.value=this.value.replace(/[^0-9.\\-]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Longitud GPS <span class="req">*</span></label><input type="text" id="f_longitudRef" value="'+fv('longitudRef')+'" placeholder="-87.206944" oninput="this.value=this.value.replace(/[^0-9.\\-]/g,\'\')"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><rect x="1" y="5" width="11" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 5V3a2 2 0 014 0v2" stroke="currentColor" stroke-width="1.2"/></svg>Empresa Constructora</div>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>Empresa Constructora <span class="req">*</span></label>'+empresaInput('f_constructora','constructora',fv('constructora'))+'</div>' +
      '<div class="form-group"><label>N° de Contrato</label><input type="text" id="f_noContrato" value="'+fv('noContrato')+'"/></div>' +
      '<div class="form-group"><label>Nombre del Coordinador <span class="req">*</span></label><input type="text" id="f_coordinador" value="'+fv('coordinador')+'"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="4" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 12c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Supervisión del Proyecto</div>' +
    '<div style="display:flex;gap:10px;margin-bottom:12px">' +
      '<label id="lbl-sup-ext" style="flex:1;display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;font-weight:400">' +
        '<input type="radio" name="tipoSup" value="externa" '+(tipoSup==='externa'?'checked':'')+' onchange="toggleSup(\'externa\')" style="accent-color:var(--az2)"/>' +
        '<div><div style="font-weight:500">Supervisión Externa</div><div style="font-size:10px;color:var(--gris3)">Empresa contratada</div></div>' +
      '</label>' +
      '<label id="lbl-sup-int" style="flex:1;display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;font-weight:400">' +
        '<input type="radio" name="tipoSup" value="interna" '+(tipoSup==='interna'?'checked':'')+' onchange="toggleSup(\'interna\')" style="accent-color:var(--az2)"/>' +
        '<div><div style="font-weight:500">Supervisión Interna</div><div style="font-size:10px;color:var(--gris3)">Personal DGCV</div></div>' +
      '</label>' +
    '</div>' +
    '<div id="sup-ext-fields">' +
      (haySupContratos
        ? '<div class="form-group"><label>Contrato de Supervisión <span class="req">*</span></label>' +
            '<select id="f_contratoSupervisionId" onchange="onSelectContratoSupervision(this)" style="width:100%">'+supOpts+'</select></div>' +
            '<div id="sup-ext-info" style="margin-top:8px;display:none"></div>'
        : '<div style="background:var(--amarillo-l);border:1px solid #d4a500;border-radius:6px;padding:10px 14px;font-size:11px;color:var(--amarillo);">' +
            '<strong>Sin contratos de supervisión registrados.</strong> Para asignar supervisión externa, primero registre un contrato de supervisión.' +
          '</div>' +
          '<input type="hidden" id="f_contratoSupervisionId" value=""/>'
      ) +
    '</div>' +
    '<div id="sup-int-fields" style="display:none">' +
      '<div class="form-group"><label>Nombre del Supervisor de Campo <span class="req">*</span></label>' +
        '<input type="text" id="f_supervisorCampo" value="'+fv('supervisorCampo')+'" placeholder="Nombre completo del supervisor de campo DGCV"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 1v2M9 1v2M1 6h11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Fechas y Plazo de Ejecución</div>' +
    '<div class="form-grid g3">' +
      '<div class="form-group"><label>Fecha de Adjudicación <span class="req">*</span></label><input type="date" id="f_fechaAdjudicacion" value="'+fv('fechaAdjudicacion')+'"/></div>' +
      '<div class="form-group"><label>Fecha de Firma del Contrato</label><input type="date" id="f_fechaContrato" value="'+fv('fechaContrato')+'"/></div>' +
      '<div class="form-group"><label>Plazo (días calendario)</label><input type="number" id="f_plazo" value="'+fv('plazo')+'" min="1" placeholder="365" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Fecha de Inicio de Obras</label><input type="date" id="f_fechaInicio" value="'+fv('fechaInicio')+'"/></div>' +
      '<div class="form-group"><label>Fecha de Finalización Programada</label><input type="date" id="f_fechaFinObra" value="'+fv('fechaFinObra')+'"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><path d="M6.5 1L9 4H12L9.5 6.5L10.5 9.5L6.5 7.5L2.5 9.5L3.5 6.5L1 4H4Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>Garantías / Fianzas</div>' +
    '<div style="background:var(--az7);border-radius:6px;padding:10px 12px;margin-bottom:8px">' +
      '<div style="font-size:10px;font-weight:600;color:var(--az2);margin-bottom:6px">GARANTÍA DE ANTICIPO</div>' +
      '<div class="form-grid g3">' +
        '<div class="form-group"><label>N° de Garantía</label><input type="text" id="f_nFianzaAnticipo" value="'+fv('nFianzaAnticipo')+'" oninput="updateFianzaOpts()"/></div>' +
        '<div class="form-group"><label>Fecha Inicio Vigencia</label><input type="date" id="f_iniFA" value="'+fv('iniFA')+'"/></div>' +
        '<div class="form-group"><label>Fecha Finalización</label><input type="date" id="f_finFA" value="'+fv('finFA')+'"/></div>' +
        '<div class="form-group span3"><label>Monto (Lempiras)</label><input type="number" id="f_montoFianzaAnticipo" value="'+fv('montoFianzaAnticipo')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');updateFianzaOpts()"/></div>' +
      '</div>' +
    '</div>' +
    '<div style="background:var(--verde-l);border-radius:6px;padding:10px 12px;margin-bottom:8px">' +
      '<div style="font-size:10px;font-weight:600;color:var(--verde);margin-bottom:6px">GARANTÍA DE CUMPLIMIENTO</div>' +
      '<div class="form-grid g3">' +
        '<div class="form-group"><label>N° de Garantía</label><input type="text" id="f_nFianzaCumplimiento" value="'+fv('nFianzaCumplimiento')+'" oninput="updateFianzaOpts()"/></div>' +
        '<div class="form-group"><label>Fecha Inicio Vigencia</label><input type="date" id="f_iniFC" value="'+fv('iniFC')+'"/></div>' +
        '<div class="form-group"><label>Fecha Finalización</label><input type="date" id="f_finFC" value="'+fv('finFC')+'"/></div>' +
        '<div class="form-group span3"><label>Monto (Lempiras)</label><input type="number" id="f_montoFianzaCumplimiento" value="'+fv('montoFianzaCumplimiento')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');updateFianzaOpts()"/></div>' +
      '</div>' +
    '</div>' +
    '<div style="background:#FDF3E3;border-radius:6px;padding:10px 12px">' +
      '<div style="font-size:10px;font-weight:600;color:var(--amarillo);margin-bottom:6px">GARANTÍA DE CALIDAD</div>' +
      '<div class="form-grid g3">' +
        '<div class="form-group"><label>N° de Garantía</label><input type="text" id="f_nFianzaCalidad" value="'+fv('nFianzaCalidad')+'" oninput="updateFianzaOpts()"/></div>' +
        '<div class="form-group"><label>Fecha Inicio Vigencia</label><input type="date" id="f_iniFCal" value="'+fv('iniFCal')+'"/></div>' +
        '<div class="form-group"><label>Fecha Finalización</label><input type="date" id="f_finFCal" value="'+fv('finFCal')+'"/></div>' +
        '<div class="form-group span3"><label>Monto (Lempiras)</label><input type="number" id="f_montoFianzaCalidad" value="'+fv('montoFianzaCalidad')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');updateFianzaOpts()"/></div>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><path d="M2 10L5 7M5 7L8 10M5 7V3M10 3h1a1 1 0 010 2h-1M10 5v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Endosos de Garantías</div>' +
    '<div id="endosos-container"></div>' +
    '<button class="add-row-btn" onclick="addEndoso()"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Agregar Endoso</button>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M6.5 3.5v6M4.5 5.5c0-.5.5-1 2-1s2 .8 2 1.5-.8 1-2 1-2 .8-2 1.5 1 1.5 2 1.5 2-.5 2-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Información Financiera y Avances</div>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>Monto Contrato Inicial (L)</label><input type="number" id="f_montoContratoInicial" value="'+fv('montoContratoInicial')+'" step="0.01" min="0" placeholder="0.00" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');recalcPagos()"/></div>' +
      '<div class="form-group"><label>Monto Modificación / Adenda (L)</label><input type="number" id="f_montoModificacion" value="'+fv('montoModificacion')+'" step="0.01" min="0" placeholder="Solo si aplica" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');recalcPagos()"/></div>' +
    '</div>' +
    '<div class="form-grid g1" style="margin-top:10px">' +
      '<div class="form-group"><label>Avance Físico de la Obra (%) <span class="req">*</span></label>' +
        '<div style="display:flex;align-items:center;gap:10px"><input type="number" id="f_avanceFisico" value="'+fv('avanceFisico')+'" min="0" max="100" step="0.1" placeholder="0.0" style="width:110px" oninput="clampPct(this);updateAvBar();syncAvanceEstado()"/><div style="flex:1;height:8px;background:var(--gris5);border-radius:4px;overflow:hidden"><div id="avf-bar" style="height:100%;background:var(--az3);border-radius:4px;transition:.3s;width:0%"></div></div><span id="avf-lbl" style="font-size:12px;font-family:var(--mono);color:var(--az2);width:40px;text-align:right">0%</span></div>' +
        '<div class="form-hint">El avance financiero se calcula automáticamente desde los pagos</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin:14px 0 8px;font-size:11px;font-weight:600;color:var(--gris2)">Registro de Pagos</div>' +
    '<div id="pagos-container"></div>' +
    '<button class="add-row-btn" onclick="addPago()"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Agregar Pago</button>' +
    '<div class="totalizador" id="totalizador">' +
      '<div class="tot-item"><strong id="tot-contrato">L 0.00</strong>Monto vigente</div>' +
      '<div class="tot-item"><strong id="tot-devengado">L 0.00</strong>Total devengado</div>' +
      '<div class="tot-item"><strong id="tot-deuda">L 0.00</strong>Deuda pendiente</div>' +
      '<div class="tot-item"><strong id="tot-pct" style="color:var(--verde)">0.00%</strong>Avance financiero</div>' +
    '</div>' +
  '</div>'
  );
}

// ═══════════════════════════════════════════════════════════
//  FORMULARIO SUPERVISIÓN
// ═══════════════════════════════════════════════════════════
function buildFormSupervision(u, p, fv, estadoOpts, deptoOpts) {
  return (
  '<div class="form-section">' +
    '<div class="form-section-title" style="color:var(--verde)"><svg viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 6.5h5M4 4.5h5M4 8.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Datos Generales del Contrato de Supervisión</div>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>N° Proceso de Contratación <span class="req">*</span></label><input type="text" id="f_nProceso" value="'+fv('nProceso')+'" placeholder="Ej. SUP-SITU-2025-001"/></div>' +
      '<div class="form-group"><label>Estado <span class="req">*</span></label><select id="f_estado" onchange="syncEstadoAvance()"><option value="">— Seleccione —</option>'+estadoOpts+'</select></div>' +
      '<div class="form-group span2"><label>Nombre / Descripción del Contrato <span class="req">*</span></label><input type="text" id="f_proyecto" value="'+fv('proyecto')+'" placeholder="Ej. Supervisión de obras de pavimentación CA-5 Norte"/></div>' +
      '<div class="form-group span2"><label>Alcance de la Supervisión <span class="req">*</span></label><textarea id="f_descripcion" rows="2" placeholder="Describa el alcance y objetivo de este contrato de supervisión">'+fv('descripcion')+'</textarea></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><path d="M6.5 1C4.567 1 3 2.567 3 4.5c0 2.5 3.5 7.5 3.5 7.5S10 7 10 4.5C10 2.567 8.433 1 6.5 1z" stroke="currentColor" stroke-width="1.2"/><circle cx="6.5" cy="4.5" r="1.2" stroke="currentColor" stroke-width="1.2"/></svg>Área Geográfica de Cobertura</div>' +
    '<div class="form-grid g3">' +
      '<div class="form-group"><label>Departamento <span class="req">*</span></label><select id="f_departamento" onchange="actualizarMunicipios()"><option value="">— Seleccione —</option>'+deptoOpts+'</select></div>' +
      '<div class="form-group"><label>Municipio <span class="req">*</span></label><select id="f_municipio"><option value="">— Seleccione departamento —</option></select></div>' +
      '<div class="form-group"><label>Aldea / Barrio / Caserío <span class="req">*</span></label><input type="text" id="f_aldeaBarrio" value="'+fv('aldeaBarrio')+'"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title" style="color:var(--verde)"><svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="4" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 12c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Empresa Supervisora</div>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>Empresa Supervisora <span class="req">*</span></label>'+empresaInput('f_supervisora','supervisora',fv('supervisora'))+'</div>' +
      '<div class="form-group"><label>N° de Contrato de Supervisión <span class="req">*</span></label><input type="text" id="f_noContratoSup" value="'+fv('noContratoSup')+'" placeholder="Ej. CS-DGCV-2025-001"/></div>' +
      '<div class="form-group"><label>Coordinador de Supervisión</label><input type="text" id="f_coordinador" value="'+fv('coordinador')+'" placeholder="Nombre del coordinador de la empresa supervisora"/></div>' +
    '</div>' +
    '<div class="form-group" style="margin-top:6px"><label>Contratos de Construcción que Supervisa</label>' +
      '<textarea id="f_contratosSupervisa" rows="2" placeholder="Liste los N° de contratos de construcción que cubre esta supervisión. Ej: CONSTR-001, CONSTR-002">'+fv('contratosSupervisa')+'</textarea>' +
      '<div class="form-hint">Estos contratos estarán disponibles al registrar proyectos de construcción con supervisión externa.</div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 1v2M9 1v2M1 6h11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Fechas y Plazo del Contrato de Supervisión</div>' +
    '<div class="form-grid g3">' +
      '<div class="form-group"><label>Fecha de Adjudicación <span class="req">*</span></label><input type="date" id="f_fechaAdjudicacion" value="'+fv('fechaAdjudicacion')+'"/></div>' +
      '<div class="form-group"><label>Fecha de Firma del Contrato</label><input type="date" id="f_fechaContrato" value="'+fv('fechaContrato')+'"/></div>' +
      '<div class="form-group"><label>Plazo (días calendario)</label><input type="number" id="f_plazo" value="'+fv('plazo')+'" min="1" placeholder="365" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Fecha de Inicio</label><input type="date" id="f_fechaInicio" value="'+fv('fechaInicio')+'"/></div>' +
      '<div class="form-group"><label>Fecha de Finalización Programada</label><input type="date" id="f_fechaFinObra" value="'+fv('fechaFinObra')+'"/></div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><path d="M6.5 1L9 4H12L9.5 6.5L10.5 9.5L6.5 7.5L2.5 9.5L3.5 6.5L1 4H4Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>Garantías / Fianzas</div>' +
    '<div style="background:var(--az7);border-radius:6px;padding:10px 12px;margin-bottom:8px">' +
      '<div style="font-size:10px;font-weight:600;color:var(--az2);margin-bottom:6px">GARANTÍA DE ANTICIPO</div>' +
      '<div class="form-grid g3">' +
        '<div class="form-group"><label>N° de Garantía</label><input type="text" id="f_nFianzaAnticipo" value="'+fv('nFianzaAnticipo')+'" oninput="updateFianzaOpts()"/></div>' +
        '<div class="form-group"><label>Fecha Inicio Vigencia</label><input type="date" id="f_iniFA" value="'+fv('iniFA')+'"/></div>' +
        '<div class="form-group"><label>Fecha Finalización</label><input type="date" id="f_finFA" value="'+fv('finFA')+'"/></div>' +
        '<div class="form-group span3"><label>Monto (Lempiras)</label><input type="number" id="f_montoFianzaAnticipo" value="'+fv('montoFianzaAnticipo')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');updateFianzaOpts()"/></div>' +
      '</div>' +
    '</div>' +
    '<div style="background:var(--verde-l);border-radius:6px;padding:10px 12px;margin-bottom:8px">' +
      '<div style="font-size:10px;font-weight:600;color:var(--verde);margin-bottom:6px">GARANTÍA DE CUMPLIMIENTO</div>' +
      '<div class="form-grid g3">' +
        '<div class="form-group"><label>N° de Garantía</label><input type="text" id="f_nFianzaCumplimiento" value="'+fv('nFianzaCumplimiento')+'" oninput="updateFianzaOpts()"/></div>' +
        '<div class="form-group"><label>Fecha Inicio Vigencia</label><input type="date" id="f_iniFC" value="'+fv('iniFC')+'"/></div>' +
        '<div class="form-group"><label>Fecha Finalización</label><input type="date" id="f_finFC" value="'+fv('finFC')+'"/></div>' +
        '<div class="form-group span3"><label>Monto (Lempiras)</label><input type="number" id="f_montoFianzaCumplimiento" value="'+fv('montoFianzaCumplimiento')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');updateFianzaOpts()"/></div>' +
      '</div>' +
    '</div>' +
    '<div style="background:#FDF3E3;border-radius:6px;padding:10px 12px">' +
      '<div style="font-size:10px;font-weight:600;color:var(--amarillo);margin-bottom:6px">GARANTÍA DE CALIDAD</div>' +
      '<div class="form-grid g3">' +
        '<div class="form-group"><label>N° de Garantía</label><input type="text" id="f_nFianzaCalidad" value="'+fv('nFianzaCalidad')+'" oninput="updateFianzaOpts()"/></div>' +
        '<div class="form-group"><label>Fecha Inicio Vigencia</label><input type="date" id="f_iniFCal" value="'+fv('iniFCal')+'"/></div>' +
        '<div class="form-group"><label>Fecha Finalización</label><input type="date" id="f_finFCal" value="'+fv('finFCal')+'"/></div>' +
        '<div class="form-group span3"><label>Monto (Lempiras)</label><input type="number" id="f_montoFianzaCalidad" value="'+fv('montoFianzaCalidad')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');updateFianzaOpts()"/></div>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><path d="M2 10L5 7M5 7L8 10M5 7V3M10 3h1a1 1 0 010 2h-1M10 5v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Endosos de Garantías</div>' +
    '<div id="endosos-container"></div>' +
    '<button class="add-row-btn" onclick="addEndoso()"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Agregar Endoso</button>' +
  '</div>' +
  '<div class="form-section">' +
    '<div class="form-section-title"><svg viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M6.5 3.5v6M4.5 5.5c0-.5.5-1 2-1s2 .8 2 1.5-.8 1-2 1-2 .8-2 1.5 1 1.5 2 1.5 2-.5 2-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Información Financiera del Contrato de Supervisión</div>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>Monto Contrato Inicial (L)</label><input type="number" id="f_montoContratoInicial" value="'+fv('montoContratoInicial')+'" step="0.01" min="0" placeholder="0.00" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');recalcPagos()"/></div>' +
      '<div class="form-group"><label>Monto Modificación / Adenda (L)</label><input type="number" id="f_montoModificacion" value="'+fv('montoModificacion')+'" step="0.01" min="0" placeholder="Solo si aplica" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');recalcPagos()"/></div>' +
    '</div>' +
    '<div class="form-grid g1" style="margin-top:10px">' +
      '<div class="form-group"><label>Avance de Ejecución (%) <span class="req">*</span></label>' +
        '<div style="display:flex;align-items:center;gap:10px"><input type="number" id="f_avanceFisico" value="'+fv('avanceFisico')+'" min="0" max="100" step="0.1" placeholder="0.0" style="width:110px" oninput="clampPct(this);updateAvBar();syncAvanceEstado()"/><div style="flex:1;height:8px;background:var(--gris5);border-radius:4px;overflow:hidden"><div id="avf-bar" style="height:100%;background:var(--verde);border-radius:4px;transition:.3s;width:0%"></div></div><span id="avf-lbl" style="font-size:12px;font-family:var(--mono);color:var(--verde);width:40px;text-align:right">0%</span></div>' +
      '</div>' +
    '</div>' +
    '<div style="margin:14px 0 8px;font-size:11px;font-weight:600;color:var(--gris2)">Registro de Pagos</div>' +
    '<div id="pagos-container"></div>' +
    '<button class="add-row-btn" onclick="addPago()"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Agregar Pago</button>' +
    '<div class="totalizador" id="totalizador">' +
      '<div class="tot-item"><strong id="tot-contrato">L 0.00</strong>Monto vigente</div>' +
      '<div class="tot-item"><strong id="tot-devengado">L 0.00</strong>Total devengado</div>' +
      '<div class="tot-item"><strong id="tot-deuda">L 0.00</strong>Deuda pendiente</div>' +
      '<div class="tot-item"><strong id="tot-pct" style="color:var(--verde)">0.00%</strong>Avance financiero</div>' +
    '</div>' +
  '</div>'
  );
}

// ═══════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  AUTH — Login con Supabase Auth (bcrypt + JWT)
// ═══════════════════════════════════════════════════════════
async function doLogin() {
  var unidad = document.getElementById('loginUnidad').value;
  var email  = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
  var pass   = document.getElementById('loginPass').value;
  var err    = document.getElementById('loginError');
  var btn    = document.querySelector('.login-btn');

  err.style.display = 'none';
  if (!unidad || !email || !pass) {
    err.style.display = 'block';
    err.textContent = 'Complete todos los campos.';
    return;
  }

  btn.textContent = 'Verificando...';
  btn.disabled = true;

  try {
    // ── 1. Autenticar con Supabase Auth (bcrypt server-side) ──
    var authResp = await fetch(SUPA_AUTH + '/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    });
    var authData = await authResp.json();

    if (!authResp.ok) {
      err.style.display = 'block';
      err.textContent = 'Correo o contraseña incorrectos.';
      btn.textContent = 'Ingresar al Sistema';
      btn.disabled = false;
      return;
    }

    // ── 2. Guardar JWT y usarlo en todas las peticiones siguientes ──
    currentToken = authData.access_token;

    // ── 3. Cargar perfil del usuario desde tabla usuarios ──
    var rows = await supaGet('usuarios',
      'select=*&email=eq.' + encodeURIComponent(email) + '&activo=eq.true'
    );

    if (!rows || rows.length === 0) {
      // Auth OK pero sin perfil — cerrar sesión
      fetch(SUPA_AUTH + '/logout', {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + currentToken }
      }).catch(function(){});
      currentToken = null;
      err.style.display = 'block';
      err.textContent = 'Usuario autenticado pero sin perfil activo. Contacte al administrador.';
      btn.textContent = 'Ingresar al Sistema';
      btn.disabled = false;
      return;
    }

    var u = rows[0];

    // ── 4. Verificar que la unidad seleccionada coincide ──
    if (u.unidad !== 'admin' && u.unidad !== unidad) {
      fetch(SUPA_AUTH + '/logout', {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + currentToken }
      }).catch(function(){});
      currentToken = null;
      err.style.display = 'block';
      err.textContent = 'Este usuario no pertenece a la unidad seleccionada.';
      btn.textContent = 'Ingresar al Sistema';
      btn.disabled = false;
      return;
    }

    // ── 5. Cargar datos y entrar al sistema ──
    btn.textContent = 'Cargando datos...';
    await cargarProyectos();
    await cargarEmpresas();

    var efectiveUnidad = u.unidad === 'admin' ? unidad : u.unidad;
    var esGlobalAdmin  = (u.unidad === 'admin' && u.rol === 'admin');
    var esGlobalViewer = (u.unidad === 'admin' && u.rol !== 'admin');
    var esUnidadAdmin  = (u.unidad !== 'admin' && u.rol === 'admin');
    var esUnidadCoord  = (u.unidad !== 'admin' && u.rol !== 'admin');

    currentUser = {
      id:            u.id,
      email:         email,
      unidad:        efectiveUnidad,
      nombre:        u.nombre,
      rol:           UNIDAD_NOMBRES[efectiveUnidad] || u.unidad,
      rolDB:         u.rol,
      unidadDB:      u.unidad,
      esAdmin:       esGlobalAdmin,
      esGlobalAdmin: esGlobalAdmin,
      esGlobalViewer:esGlobalViewer,
      esUnidadAdmin: esUnidadAdmin,
      esUnidadCoord: esUnidadCoord
    };

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display    = 'flex';
    document.getElementById('userName').textContent      = u.nombre;
    document.getElementById('userAvatar').textContent    = u.nombre.split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
    document.getElementById('topbarFecha').textContent   = new Date().toLocaleDateString('es-HN',{day:'2-digit',month:'short',year:'numeric'});

    var syncStatus = document.getElementById('syncStatus');
    var syncBtn    = document.getElementById('syncBtn');
    if (syncStatus) syncStatus.style.display = 'flex';
    if (syncBtn)    syncBtn.style.display    = 'flex';

    var navUsuarios        = document.getElementById('nav-usuarios');
    var navUsuariosSection = document.getElementById('nav-usuarios-section');
    var navEmpresas        = document.getElementById('nav-empresas');
    if (navUsuarios)        navUsuarios.style.display        = currentUser.esGlobalAdmin ? 'flex' : 'none';
    if (navUsuariosSection) navUsuariosSection.style.display = currentUser.esGlobalAdmin ? 'block' : 'none';
    if (navEmpresas)        navEmpresas.style.display        = currentUser.esGlobalAdmin ? 'flex' : 'none';
    var reportBtn = document.getElementById('reportBtn');
    if (reportBtn) reportBtn.style.display = currentUser.esAdmin ? 'flex' : 'none';

    if (!currentUser.esAdmin && !currentUser.esGlobalViewer) {
      document.querySelectorAll('.nav-item[id^="nav-"]').forEach(function(el) {
        var v = el.id.replace('nav-', '');
        if (v !== 'dashboard' && v !== efectiveUnidad && v !== 'usuarios' && v !== 'formatos') el.style.display = 'none';
      });
    }

    updateBadges();
    showView('dashboard', document.getElementById('nav-dashboard'));
    btn.textContent = 'Ingresar al Sistema';
    btn.disabled = false;
    showToast(dbOnline ? 'Bienvenido, ' + u.nombre + '.' : 'Sesión iniciada (sin conexión a BD).', dbOnline ? 'ok' : 'err');

  } catch(e) {
    currentToken = null;
    err.style.display = 'block';
    err.textContent = 'Error de conexión: ' + e.message;
    btn.textContent = 'Ingresar al Sistema';
    btn.disabled = false;
  }
}

function doLogout() {
  // Invalidar JWT en Supabase Auth
  if (currentToken) {
    fetch(SUPA_AUTH + '/logout', {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + currentToken }
    }).catch(function() {});
  }
  currentToken = null;
  currentUser  = null;
  DB = { rvp:[], rvnp:[], rre:[], fext:[], fbcie:[], ldv:[] };
  document.getElementById('appShell').style.display  = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.querySelectorAll('.nav-item').forEach(function(el) { el.style.display = ''; });
  var navUsuarios = document.getElementById('nav-usuarios');
  var navUsuariosSection = document.getElementById('nav-usuarios-section');
  var navEmpresasL = document.getElementById('nav-empresas');
  if (navUsuarios) navUsuarios.style.display = 'none';
  if (navUsuariosSection) navUsuariosSection.style.display = 'none';
  if (navEmpresasL) navEmpresasL.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
//  NAVEGACIÓN
// ═══════════════════════════════════════════════════════════
function showView(view, el) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (el) el.classList.add('active');
  if (view === 'dashboard') renderDashboard();
  else if (view === 'usuarios') renderUsuariosPanel();
  else if (view === 'empresas') renderEmpresasPanel();
  else if (view === 'formatos') renderFormatosPanel();
  else renderUnidad(view);
  if (isMobile && isMobile()) closeNav();
}

function updateBadges() {
  Object.keys(UNIDADES).forEach(function(k) {
    var b = document.getElementById('badge-' + k);
    if (b) b.textContent = (DB[k] || []).length;
  });
}

var UNIT_NAV_LOGOS = {
  rvp: '<svg class=\"nav-icon\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1\" y=\"9\" width=\"10\" height=\"5\" rx=\"1\" stroke=\"currentColor\" stroke-width=\"1.2\"/><circle cx=\"3.5\" cy=\"14\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"8.5\" cy=\"14\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><rect x=\"4\" y=\"6\" width=\"5\" height=\"3\" rx=\".5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><line x1=\"9\" y1=\"7.5\" x2=\"14\" y2=\"5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><circle cx=\"14\" cy=\"4.5\" r=\"1\" stroke=\"currentColor\" stroke-width=\"1.1\"/><line x1=\"1\" y1=\"3\" x2=\"15\" y2=\"3\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.5\"/></svg>',
  rvnp: '<svg class=\"nav-icon\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"6\" y=\"5\" width=\"8\" height=\"4\" rx=\".8\" stroke=\"currentColor\" stroke-width=\"1.2\"/><path d=\"M6 7H2L1 9H6\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"3\" cy=\"11\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"12\" cy=\"11\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M2 8.5L1 11H3\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/><line x1=\"1\" y1=\"13\" x2=\"15\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.5\"/><line x1=\"10\" y1=\"5\" x2=\"10\" y2=\"3\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><rect x=\"8.5\" y=\"2\" width=\"3\" height=\"1.2\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1\"/></svg>',
  rre: '<svg class=\"nav-icon\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1\" y=\"9\" width=\"8\" height=\"4\" rx=\".8\" stroke=\"currentColor\" stroke-width=\"1.2\"/><circle cx=\"2.5\" cy=\"13.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"7.5\" cy=\"13.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><rect x=\"5\" y=\"6.5\" width=\"3\" height=\"2.5\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M8 7.5L11 4L13 5.5L11 8\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 5.5L14.5 4.5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M13 1.5L13 3M15 2.5L14 3.2M11 2.5L12 3.2\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/></svg>',
  fext: '<svg class=\"nav-icon\" viewBox=\"0 0 16 16\" fill=\"none\"><line x1=\"4\" y1=\"1\" x2=\"4\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><line x1=\"4\" y1=\"2\" x2=\"13\" y2=\"2\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><line x1=\"4\" y1=\"2\" x2=\"9\" y2=\"5\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"13\" y1=\"2\" x2=\"10\" y2=\"5.5\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"10\" y1=\"5.5\" x2=\"10\" y2=\"9\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><rect x=\"8.5\" y=\"9\" width=\"3\" height=\"2.5\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1\"/><line x1=\"1\" y1=\"13\" x2=\"8\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><circle cx=\"13\" cy=\"11\" r=\"2.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M13 9.8V10.5M13 11.5V12.2M12 11H14\" stroke=\"currentColor\" stroke-width=\".9\" stroke-linecap=\"round\"/></svg>',
  fbcie: '<svg class=\"nav-icon\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M1 11 C1 11 4 4 8 4 S15 11 15 11\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" fill=\"none\"/><line x1=\"1\" y1=\"11\" x2=\"15\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><line x1=\"4.5\" y1=\"7.5\" x2=\"4.5\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"5\" x2=\"8\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"11.5\" y1=\"7.5\" x2=\"11.5\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"1\" y1=\"13\" x2=\"15\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.5\"/></svg>',
  ldv: '<svg class=\"nav-icon\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1\" y=\"8\" width=\"7\" height=\"4\" rx=\".8\" stroke=\"currentColor\" stroke-width=\"1.2\"/><circle cx=\"2.5\" cy=\"12.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"6.5\" cy=\"12.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><rect x=\"4\" y=\"5.5\" width=\"3\" height=\"2.5\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M7 6.5L9.5 5L11 7L9 9\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M9 9L9 11.5\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><path d=\"M13 3C13 3 12 5 12 7S13 9 13 9S14 7 14 5S13 3 13 3Z\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/><path d=\"M15 5C15 5 14 6.5 14 8\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/></svg>'
};

// ═══════════════════════════════════════════════════════════
//  ALERTAS DE VENCIMIENTO DE FIANZAS
// ═══════════════════════════════════════════════════════════
function getAlertasFianzas() {
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var alertas = [];

  Object.entries(DB).forEach(function(entry) {
    var unidadKey = entry[0]; var proyectos = entry[1];
    (proyectos||[]).forEach(function(p) {

      // CONDICIÓN 2: proyecto Terminado → no genera alertas de fianzas
      if (p.estado === 'Terminado') return;

      // CONDICIÓN 3: devuelve la fecha efectiva de alerta para una fianza.
      // Si existe un endoso vinculado a esa fianza con nueva fecha de vencimiento,
      // se usa la fecha más reciente del endoso en lugar de la fecha original.
      function fechaEfectiva(nFianza, fechaOriginal) {
        if (!fechaOriginal || !nFianza) return fechaOriginal || null;
        var endosos = p.endosos || [];
        var vinculados = endosos.filter(function(e) {
          return e.fianzaVinculada && e.nuevaFechaVenc &&
                 e.fianzaVinculada.indexOf(nFianza) >= 0;
        });
        if (!vinculados.length) return fechaOriginal;
        // Usar la fecha de vencimiento más lejana del endoso más reciente
        vinculados.sort(function(a,b){
          return a.nuevaFechaVenc > b.nuevaFechaVenc ? -1 : 1;
        });
        return vinculados[0].nuevaFechaVenc;
      }

      var checks = [
        { tipo:'ANTICIPO',     n:p.nFianzaAnticipo,     fechaOrig:p.finFA,   fecha:fechaEfectiva(p.nFianzaAnticipo,     p.finFA)   },
        { tipo:'CUMPLIMIENTO', n:p.nFianzaCumplimiento, fechaOrig:p.finFC,   fecha:fechaEfectiva(p.nFianzaCumplimiento, p.finFC)   },
        { tipo:'CALIDAD',      n:p.nFianzaCalidad,      fechaOrig:p.finFCal, fecha:fechaEfectiva(p.nFianzaCalidad,      p.finFCal) },
      ];

      checks.forEach(function(c) {
        if (!c.fecha || !c.n) return;
        var f = new Date(c.fecha); f.setHours(0,0,0,0);
        var diasRestantes = Math.round((f - hoy) / (1000*60*60*24));
        var estado = diasRestantes < 0  ? 'vencida'
                   : diasRestantes <= 30 ? 'prox30'
                   : diasRestantes <= 60 ? 'prox60'
                   : null;
        if (!estado) return;
        alertas.push({
          proyecto:     p.proyecto || '—',
          unidad:       UNIDADES[unidadKey] ? UNIDADES[unidadKey].nombre : unidadKey,
          unidadKey:    unidadKey,
          proyIdx:      (DB[unidadKey]||[]).indexOf(p),
          tipo:         c.tipo,
          n:            c.n,
          fecha:        c.fecha,
          esEndoso:     c.fecha !== c.fechaOrig,
          diasRestantes:diasRestantes,
          estado:       estado
        });
      });
    });
  });

  // Ordenar: vencidas primero, luego por días restantes
  alertas.sort(function(a,b){
    if (a.estado==='vencida' && b.estado!=='vencida') return -1;
    if (b.estado==='vencida' && a.estado!=='vencida') return  1;
    return a.diasRestantes - b.diasRestantes;
  });
  return alertas;
}

function renderAlertasBanner(alertas) {
  if (!alertas || !alertas.length) return '';

  var vencidas = alertas.filter(function(a){ return a.estado==='vencida'; });
  var proximas = alertas.filter(function(a){ return a.estado!=='vencida'; });

  var rows = alertas.map(function(a) {
    var tagClass = a.estado==='vencida' ? 'vencida' : a.estado==='prox30' ? 'prox30' : 'prox60';
    var tagText  = a.estado==='vencida'
      ? 'Vencida hace '+(Math.abs(a.diasRestantes))+' día'+(Math.abs(a.diasRestantes)!==1?'s':'')
      : 'Vence en '+a.diasRestantes+' día'+(a.diasRestantes!==1?'s':'');
    var endosoBadge = a.esEndoso
      ? '<span style="font-size:8px;background:var(--verde-l);color:var(--verde);padding:1px 6px;border-radius:4px;margin-left:5px;font-weight:600;flex-shrink:0;">ENDOSO</span>'
      : '';
    var navBtn = (a.unidadKey && a.proyIdx !== undefined && a.proyIdx >= 0)
      ? '<button onclick="navegarAAlerta(\''+a.unidadKey+'\','+a.proyIdx+')" style="margin-left:auto;flex-shrink:0;background:var(--az2);color:#fff;border:none;border-radius:5px;padding:3px 10px;font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font);">Ver proyecto →</button>'
      : '';
    return '<div class="alerta-row" style="cursor:pointer" onclick="navegarAAlerta(\''+a.unidadKey+'\','+a.proyIdx+')" title="Clic para ir al proyecto">'
      +'<span class="alerta-tag '+tagClass+'">'+tagText+'</span>'
      +'<span style="font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+a.proyecto+'</span>'
      +endosoBadge
      +'<span style="color:var(--gris3);flex-shrink:0;margin-left:8px;">'+a.tipo+'</span>'
      +'<span style="color:var(--gris3);flex-shrink:0;margin-left:8px;font-family:var(--mono);font-size:10px;">'+a.n+'</span>'
      +'<span style="color:var(--gris3);flex-shrink:0;margin-left:8px;">'+a.unidad.split(' ').slice(0,3).join(' ')+'</span>'
      +navBtn
      +'</div>';
  }).join('');

  var headerParts = [];
  if (vencidas.length) headerParts.push('<span class="alerta-count vencida">'+vencidas.length+' vencida'+(vencidas.length!==1?'s':'')+'</span>');
  if (proximas.length) headerParts.push('<span class="alerta-count prox">'+proximas.length+' por vencer</span>');

  var dominante = vencidas.length ? 'vencida' : 'prox';

  return '<div class="alerta-banner" id="alerta-banner">'
    +'<div class="alerta-header" onclick="toggleAlertaBanner()">'
    +'<span class="alerta-dot '+dominante+'"></span>'
    +'<span style="font-size:12px;font-weight:600;color:var(--gris1);">⚠️  Alertas de Garantías / Fianzas</span>'
    +headerParts.join(' ')
    +'<span class="alerta-toggle" id="alerta-toggle-icon">▼ ver detalle</span>'
    +'</div>'
    +'<div class="alerta-list" id="alerta-list" style="display:none;">'+rows+'</div>'
    +'</div>';
}

function toggleAlertaBanner() {
  var list = document.getElementById('alerta-list');
  var icon = document.getElementById('alerta-toggle-icon');
  if (!list) return;
  var open = list.style.display !== 'none';
  list.style.display = open ? 'none' : 'block';
  if (icon) icon.textContent = open ? '▼ ver detalle' : '▲ ocultar';
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  var allP  = Object.values(DB).flat();
  var total = allP.length;
  var ejec  = allP.filter(function(p){ return p.estado === 'En Ejecución'; }).length;
  var susp  = allP.filter(function(p){ return p.estado === 'Suspendido'; }).length;
  var avgF  = total ? Math.round(allP.reduce(function(a,p){ return a + (parseFloat(p.avanceFisico)||0); }, 0) / total) : 0;
  var avgFin= total ? Math.round(allP.reduce(function(a,p){ return a + calcAvFin(p); }, 0) / total) : 0;

  var chartBars = Object.entries(UNIDADES).map(function(entry) {
    var k = entry[0]; var u = entry[1];
    var pl = DB[k] || [];
    var af   = pl.length ? Math.round(pl.reduce(function(a,p){ return a+(parseFloat(p.avanceFisico)||0); },0)/pl.length) : 0;
    var afin = pl.length ? Math.round(pl.reduce(function(a,p){ return a+calcAvFin(p); },0)/pl.length) : 0;
    return '<div class="chart-bar-group">' +
      '<div style="display:flex;gap:2px;align-items:flex-end;height:90px;">' +
        '<div class="chart-bar" style="flex:1;height:'+Math.max(af,2)+'%;background:var(--az3);" title="Físico: '+af+'%"></div>' +
        '<div class="chart-bar" style="flex:1;height:'+Math.max(afin,2)+'%;background:var(--verde);" title="Financiero: '+afin+'%"></div>' +
      '</div>' +
      '<div class="chart-bar-lbl" style="font-size:8px">' + u.nombre.split(' ').slice(0,2).join(' ') + '</div>' +
    '</div>';
  }).join('');

  var ucards = Object.entries(UNIDADES).map(function(entry) {
    var k = entry[0]; var u = entry[1];
    var pl = DB[k] || [];
    var af   = pl.length ? Math.round(pl.reduce(function(a,p){ return a+(parseFloat(p.avanceFisico)||0); },0)/pl.length) : 0;
    var afin = pl.length ? Math.round(pl.reduce(function(a,p){ return a+calcAvFin(p); },0)/pl.length) : 0;
    var eN = pl.filter(function(p){ return p.estado==='En Ejecución'; }).length;
    var sN = pl.filter(function(p){ return p.estado==='Suspendido'; }).length;
    var canNav = currentUser && (currentUser.esGlobalAdmin || currentUser.esGlobalViewer || currentUser.unidad===k);
    return '<div class="unidad-card" onclick="' + (canNav ? 'showView(\''+k+'\',document.getElementById(\'nav-'+k+'\'))' : '') + '">' +
      '<div class="uc-header">' +
        '<div class="uc-icon" style="background:'+u.bg+';width:36px;height:36px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:'+u.color+'">'+(UNIT_NAV_LOGOS[k]||'')+'</div>' +
        '<div><div class="uc-title">'+u.nombre+'</div><div class="uc-sub">'+pl.length+' proyecto'+(pl.length!==1?'s':'')+'</div></div>' +
        '<div class="uc-arrow" style="color:'+u.color+'">→</div>' +
      '</div>' +
      '<div class="uc-stats">' +
        '<div class="uc-stat"><div class="uc-stat-num" style="color:'+u.color+'">'+eN+'</div><div class="uc-stat-lbl">En Ejecución</div></div>' +
        '<div class="uc-stat"><div class="uc-stat-num" style="color:'+(sN>0?'var(--amarillo)':u.color)+'">'+sN+'</div><div class="uc-stat-lbl">Suspendidos</div></div>' +
      '</div>' +
      '<div class="uc-bar-row"><span class="uc-bar-lbl">Físico</span><div class="uc-bar-track"><div class="uc-bar-fill" style="width:'+af+'%;background:'+u.color+'"></div></div><span class="uc-bar-pct">'+af+'%</span></div>' +
      '<div class="uc-bar-row"><span class="uc-bar-lbl">Financiero</span><div class="uc-bar-track"><div class="uc-bar-fill" style="width:'+afin+'%;background:var(--verde)"></div></div><span class="uc-bar-pct">'+afin+'%</span></div>' +
    '</div>';
  }).join('');

  document.getElementById('mainContent').innerHTML =
    '<div class="page-header"><h2>Dashboard General — Red Vial Nacional</h2><p>Resumen ejecutivo de todas las unidades · Año 2025</p></div>' +
    renderAlertasBanner(getAlertasFianzas()) +
    '<div class="kpi-grid">' +
      '<div class="kpi-card az"><div class="kpi-num">'+total+'</div><div class="kpi-lbl">Total de Proyectos</div></div>' +
      '<div class="kpi-card verde"><div class="kpi-num">'+ejec+'</div><div class="kpi-lbl">En Ejecución</div></div>' +
      '<div class="kpi-card amarillo"><div class="kpi-num">'+avgF+'%</div><div class="kpi-lbl">Avance Físico Prom.</div></div>' +
      '<div class="kpi-card az"><div class="kpi-num">'+avgFin+'%</div><div class="kpi-lbl">Avance Financiero Prom.</div></div>' +
      '<div class="kpi-card '+(susp>0?'rojo':'gris')+'"><div class="kpi-num">'+susp+'</div><div class="kpi-lbl">Suspendidos</div></div>' +
    '</div>' +
    '<div class="chart-wrap"><div class="chart-title"><span>Avance por Unidad</span><div class="chart-legend"><div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--az3)"></div>Físico</div><div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--verde)"></div>Financiero</div></div></div><div class="chart-bars">'+chartBars+'</div></div>' +
    '<div style="font-size:12px;font-weight:600;color:var(--gris2);margin-bottom:10px;">Módulos por Unidad</div>' +
    '<div class="unidades-grid">'+ucards+'</div>';
}

// ═══════════════════════════════════════════════════════════
//  PERMISOS
//  Retorna objeto { canAdd, canEdit, canDelete } para un proyecto p
//  Si p es null, evalúa permisos de "nuevo proyecto"
// ═══════════════════════════════════════════════════════════
function getPerms(unidadKey, p) {
  var cu = currentUser;
  if (!cu) return { canAdd:false, canEdit:false, canDelete:false };

  // Admin General: todo permitido en toda unidad
  if (cu.esGlobalAdmin) return { canAdd:true, canEdit:true, canDelete:true };

  // Coordinator General (unidad=admin, rol=coordinador): solo lectura
  if (cu.esGlobalViewer) return { canAdd:false, canEdit:false, canDelete:false };

  // Usuarios de otra unidad: sin acceso
  if (cu.unidad !== unidadKey) return { canAdd:false, canEdit:false, canDelete:false };

  // Admin de unidad: puede todo dentro de su unidad
  if (cu.esUnidadAdmin) return { canAdd:true, canEdit:true, canDelete:true };

  // Coordinador de unidad: solo puede editar/eliminar sus propios proyectos
  if (cu.esUnidadCoord) {
    var esMio = p && p.historial && p.historial.length > 0 && p.historial[0].usuario === cu.nombre;
    return { canAdd:true, canEdit:!!esMio, canDelete:!!esMio };
  }

  return { canAdd:false, canEdit:false, canDelete:false };
}

var UNIT_HDR_LOGOS = {
  rvp: '<svg style=\"width:28px;height:28px;\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1\" y=\"9\" width=\"10\" height=\"5\" rx=\"1\" stroke=\"currentColor\" stroke-width=\"1.2\"/><circle cx=\"3.5\" cy=\"14\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"8.5\" cy=\"14\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><rect x=\"4\" y=\"6\" width=\"5\" height=\"3\" rx=\".5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><line x1=\"9\" y1=\"7.5\" x2=\"14\" y2=\"5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><circle cx=\"14\" cy=\"4.5\" r=\"1\" stroke=\"currentColor\" stroke-width=\"1.1\"/><line x1=\"1\" y1=\"3\" x2=\"15\" y2=\"3\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.5\"/></svg>',
  rvnp: '<svg style=\"width:28px;height:28px;\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"6\" y=\"5\" width=\"8\" height=\"4\" rx=\".8\" stroke=\"currentColor\" stroke-width=\"1.2\"/><path d=\"M6 7H2L1 9H6\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"3\" cy=\"11\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"12\" cy=\"11\" r=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M2 8.5L1 11H3\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/><line x1=\"1\" y1=\"13\" x2=\"15\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.5\"/><line x1=\"10\" y1=\"5\" x2=\"10\" y2=\"3\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><rect x=\"8.5\" y=\"2\" width=\"3\" height=\"1.2\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1\"/></svg>',
  rre: '<svg style=\"width:28px;height:28px;\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1\" y=\"9\" width=\"8\" height=\"4\" rx=\".8\" stroke=\"currentColor\" stroke-width=\"1.2\"/><circle cx=\"2.5\" cy=\"13.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"7.5\" cy=\"13.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><rect x=\"5\" y=\"6.5\" width=\"3\" height=\"2.5\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M8 7.5L11 4L13 5.5L11 8\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 5.5L14.5 4.5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M13 1.5L13 3M15 2.5L14 3.2M11 2.5L12 3.2\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/></svg>',
  fext: '<svg style=\"width:28px;height:28px;\" viewBox=\"0 0 16 16\" fill=\"none\"><line x1=\"4\" y1=\"1\" x2=\"4\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><line x1=\"4\" y1=\"2\" x2=\"13\" y2=\"2\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><line x1=\"4\" y1=\"2\" x2=\"9\" y2=\"5\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"13\" y1=\"2\" x2=\"10\" y2=\"5.5\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"10\" y1=\"5.5\" x2=\"10\" y2=\"9\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><rect x=\"8.5\" y=\"9\" width=\"3\" height=\"2.5\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1\"/><line x1=\"1\" y1=\"13\" x2=\"8\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><circle cx=\"13\" cy=\"11\" r=\"2.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M13 9.8V10.5M13 11.5V12.2M12 11H14\" stroke=\"currentColor\" stroke-width=\".9\" stroke-linecap=\"round\"/></svg>',
  fbcie: '<svg style=\"width:28px;height:28px;\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M1 11 C1 11 4 4 8 4 S15 11 15 11\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" fill=\"none\"/><line x1=\"1\" y1=\"11\" x2=\"15\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><line x1=\"4.5\" y1=\"7.5\" x2=\"4.5\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"5\" x2=\"8\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"11.5\" y1=\"7.5\" x2=\"11.5\" y2=\"11\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><line x1=\"1\" y1=\"13\" x2=\"15\" y2=\"13\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-dasharray=\"2 1.5\"/></svg>',
  ldv: '<svg style=\"width:28px;height:28px;\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1\" y=\"8\" width=\"7\" height=\"4\" rx=\".8\" stroke=\"currentColor\" stroke-width=\"1.2\"/><circle cx=\"2.5\" cy=\"12.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><circle cx=\"6.5\" cy=\"12.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.1\"/><rect x=\"4\" y=\"5.5\" width=\"3\" height=\"2.5\" rx=\".4\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M7 6.5L9.5 5L11 7L9 9\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M9 9L9 11.5\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><path d=\"M13 3C13 3 12 5 12 7S13 9 13 9S14 7 14 5S13 3 13 3Z\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/><path d=\"M15 5C15 5 14 6.5 14 8\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\"/></svg>'
};

// ═══════════════════════════════════════════════════════════
//  MÓDULO DE UNIDAD — TABLA DE PROYECTOS
// ═══════════════════════════════════════════════════════════
function renderUnidad(u) {
  var unidad   = UNIDADES[u];
  var plist    = DB[u] || [];
  var permsNew = getPerms(u, null);  // permisos para "Nuevo Proyecto" (p=null)
  // Alertas de fianzas para esta unidad
  var alertasUnidad = getAlertasFianzas().filter(function(a){
    return a.unidad === (UNIDADES[u] ? UNIDADES[u].nombre : u);
  });
  var alertasBannerUnidad = alertasUnidad.length ? renderAlertasBanner(alertasUnidad) : '';
  var af   = plist.length ? Math.round(plist.reduce(function(a,p){ return a+(parseFloat(p.avanceFisico)||0); },0)/plist.length) : 0;
  var afin = plist.length ? Math.round(plist.reduce(function(a,p){ return a+calcAvFin(p); },0)/plist.length) : 0;

  var SC = { 'En Ejecución':'ejec','En Proceso / Contratación':'proc','Suspendido':'susp','Terminado':'term' };

  var rows = plist.length ? plist.map(function(p, i) {
    var sc   = SC[p.estado] || 'proc';
    var paf  = parseFloat(p.avanceFisico) || 0;
    var pafin= calcAvFin(p);
    var cPor = p.historial && p.historial.length ? p.historial[0].usuario : '—';
    var uMod  = p.historial && p.historial.length > 1 ? p.historial[p.historial.length-1] : null;
    var perms = getPerms(u, p);  // permisos individuales para este proyecto
    return '<tr>' +
      '<td style="font-family:var(--mono);color:var(--gris3);font-size:10px">'+(String(i+1).padStart(2,'0'))+'</td>' +
      '<td style="max-width:220px">' +
      '<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">' +
      '<span class="badge-tipo '+(p.tipoProyecto==='supervision'?'superv':'constr')+'">'+(p.tipoProyecto==='supervision'?'Supervisión':'Construcción')+'</span>' +
      '</div>' +
      '<div style="font-weight:500;font-size:12px;line-height:1.3">'+p.proyecto+'</div>' +
      '<div style="font-size:10px;color:var(--gris3);margin-top:2px">'+(p.departamento||'')+(p.municipio?' · '+p.municipio:'')+'</div>' +
      '</td>' +
      '<td style="font-size:11px;color:var(--gris2)">'+(p.constructora||'—')+'</td>' +
      '<td><div style="font-size:11px;font-weight:500;color:var(--az2)">'+cPor+'</div>'+(uMod&&uMod.usuario!==cPor?'<div style="font-size:9px;color:var(--gris3)">Mod: '+uMod.usuario+'</div>':'')+'</td>' +
      '<td><div class="mini-bar"><div class="mini-bar-fill az-fill" style="width:'+Math.min(paf,100)+'%"></div></div><div style="font-size:9px;font-family:var(--mono)">'+(paf.toFixed(1))+'%</div></td>' +
      '<td><div class="mini-bar"><div class="mini-bar-fill gr-fill" style="width:'+Math.min(pafin,100)+'%"></div></div><div style="font-size:9px;font-family:var(--mono)">'+(pafin.toFixed(1))+'%</div></td>' +
      '<td style="font-size:11px;font-family:var(--mono);color:var(--gris2)">'+((p.tipoProyecto==='supervision'?p.noContratoSup:p.noContrato)||'—')+'</td>' +
      '<td><span class="pill '+sc+'">'+(p.estado||'—')+'</span></td>' +
      '<td><div class="tbl-actions">' +
        '<button class="tbl-btn" onclick="openDetail(\''+u+'\','+i+')">Ver</button>' +
        (perms.canEdit   ? '<button class="tbl-btn edit" onclick="openForm(\''+u+'\','+i+')">Editar</button>' : '') +
        (perms.canDelete ? '<button class="tbl-btn" style="color:var(--rojo)" onclick="deleteProject(\''+u+'\','+i+')">✕</button>' : '') +
      '</div></td>' +
    '</tr>';
  }).join('') :
    '<tr><td colspan="9"><div class="empty-state"><svg viewBox="0 0 36 36" fill="none" style="width:32px;margin:0 auto 8px;display:block;opacity:.3"><rect x="4" y="8" width="28" height="22" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 8V6a2 2 0 014 0v2" stroke="currentColor" stroke-width="1.5"/><path d="M12 18h12M12 23h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg><p>No hay proyectos registrados.'+(permsNew.canAdd?' Haga clic en "Nuevo Proyecto" para comenzar.':'')+'</p></div></td></tr>';

  document.getElementById('mainContent').innerHTML =
    '<div class="module-header" style="background:'+unidad.color+'">' +
      '<div class="module-icon" style="background:rgba(255,255,255,.18);border-radius:8px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#fff;">'+(UNIT_HDR_LOGOS[u]||'')+'</div>' +
      '<div class="module-info"><h2>'+unidad.nombre+'</h2><p>'+plist.length+' proyecto'+(plist.length!==1?'s':'')+' registrado'+(plist.length!==1?'s':'')+'</p></div>' +
      '<div class="module-kpis"><div class="mod-kpi"><div class="mod-kpi-num">'+af+'%</div><div class="mod-kpi-lbl">Físico</div></div><div class="mod-kpi"><div class="mod-kpi-num">'+afin+'%</div><div class="mod-kpi-lbl">Financiero</div></div><div class="mod-kpi"><div class="mod-kpi-num">'+plist.filter(function(p){return p.estado==='En Ejecución';}).length+'</div><div class="mod-kpi-lbl">En Ejecución</div></div></div>' +
    '</div>' +
    alertasBannerUnidad +
    (currentUser.esGlobalViewer ? '<div style="background:var(--amarillo-l);border:1px solid #d4a500;border-radius:6px;padding:9px 14px;margin-bottom:12px;font-size:11px;color:var(--amarillo);display:flex;align-items:center;gap:8px;"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7 4v3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="10" r=".6" fill="currentColor"/></svg><strong>Modo solo lectura</strong> — Su perfil tiene acceso de visualización. Para modificar proyectos contacte al coordinador de la unidad.</div>' : '') +
    '<div class="table-wrap">' +
      '<div class="table-toolbar">' +
        '<h3>Proyectos Registrados</h3>' +
        '<div class="search-box"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="var(--gris3)" stroke-width="1.2"/><path d="M8 8l2.5 2.5" stroke="var(--gris3)" stroke-width="1.2" stroke-linecap="round"/></svg><input type="text" placeholder="Buscar..." oninput="filterTable(this.value,\''+u+'\')" /></div>' +
        '<select class="filter-select" onchange="filterEstado(this.value,\''+u+'\')">' +
          '<option value="">Todos los estados</option>' +
          ESTADOS.map(function(e){ return '<option>'+e+'</option>'; }).join('') +
        '</select>' +
        (permsNew.canAdd ? '<button class="btn btn-primary" onclick="openForm(\''+u+'\',null)"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>Nuevo Proyecto</button>' : '') +
      '</div>' +
      '<div style="overflow-x:auto"><table class="tbl" id="tbl-'+u+'">' +
        '<thead><tr><th>N°</th><th>Proyecto</th><th>Constructora</th><th>Registrado por</th><th>Av. Físico</th><th>Av. Financiero</th><th>N° Contrato</th><th>Estado</th><th>Acciones</th></tr></thead>' +
        '<tbody id="tbody-'+u+'">'+rows+'</tbody>' +
      '</table></div>' +
    '</div>';
}

function filterTable(q, u) {
  var qL = q.toLowerCase().trim();
  var plist = DB[u] || [];
  document.querySelectorAll('#tbody-'+u+' tr').forEach(function(r, i) {
    if (!qL) { r.style.display = ''; return; }
    var p = plist[i];
    if (!p) { r.style.display = 'none'; return; }
    // Busca en: N° Proceso, N° Contrato, Nombre del Proyecto, Constructora, Supervisora
    var fields = [
      p.nProceso    || '',
      p.noContrato  || '',
      p.proyecto    || '',
      p.constructora|| '',
      p.supervisora || ''
    ];
    r.style.display = fields.some(function(f){ return f.toLowerCase().includes(qL); }) ? '' : 'none';
  });
}
function filterEstado(e, u) {
  document.querySelectorAll('#tbody-'+u+' tr').forEach(function(r) {
    r.style.display = (!e || r.textContent.includes(e)) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════
//  PANEL DE DETALLE
// ═══════════════════════════════════════════════════════════
function openDetail(u, i) {
  var p = DB[u][i];
  if (!p) return;
  document.getElementById('dpTitle').textContent = p.proyecto || 'Sin nombre';
  document.getElementById('dpSub').textContent   = UNIDADES[u].nombre + ' · ' + (p.departamento||'') + (p.municipio?' · '+p.municipio:'');

  var SC = { 'En Ejecución':'ejec','En Proceso / Contratación':'proc','Suspendido':'susp','Terminado':'term' };
  var sc  = SC[p.estado] || 'proc';
  var af  = parseFloat(p.avanceFisico) || 0;
  var afin= calcAvFin(p);
  var cPor= p.historial && p.historial.length ? p.historial[0] : null;
  var uMod= p.historial && p.historial.length > 1 ? p.historial[p.historial.length-1] : null;

  var pagosHtml = (p.pagos||[]).length ? (p.pagos||[]).map(function(pg,idx) {
    return '<div style="background:var(--gris6);border-radius:5px;padding:8px 10px;margin-bottom:5px;">' +
      '<div style="display:flex;justify-content:space-between"><span style="font-size:11px;font-weight:500">Pago N° '+(idx+1)+'</span><span style="font-size:13px;font-weight:500;color:var(--verde);font-family:var(--mono)">L '+fmtL(pg.monto)+'</span></div>' +
      '<div style="font-size:10px;color:var(--gris3);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px">' +
        (pg.fechaIngreso ? '<span>Ingreso: '+pg.fechaIngreso+'</span>' : '') +
        ((pg.periodoIni||pg.periodoFin) ? '<span>Período: '+(pg.periodoIni||'?')+' → '+(pg.periodoFin||'?')+'</span>' : '') +
        (pg.contexto ? '<span>'+pg.contexto+'</span>' : '') +
      '</div>' +
    '</div>';
  }).join('') : '<div style="font-size:11px;color:var(--gris3)">Sin pagos registrados</div>';

  var histHtml = (p.historial||[]).length ? [...(p.historial||[])].reverse().map(function(h, idx) {
    var cambios = Array.isArray(h.cambios) ? h.cambios : [h.cambios||''];
    var color   = h.accion==='Creación' ? 'var(--verde)' : 'var(--az3)';
    return '<div class="hist-row" style="cursor:pointer" onclick="toggleHistDetail(\'hd'+idx+'\')">' +
      '<div class="hist-dot" style="background:'+color+'"></div>' +
      '<div style="flex:1"><span style="font-size:11px;font-weight:500;color:'+color+'">'+(h.accion||'Cambio')+'</span> <span style="font-size:11px">'+h.usuario+'</span>' +
        '<div id="hd'+idx+'" style="display:none;margin-top:4px;background:var(--gris6);border-radius:4px;padding:6px 8px">'+
          cambios.map(function(c){ return '<div style="font-size:10px;color:var(--gris2);padding:2px 0;border-bottom:1px solid var(--border)">'+c+'</div>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="hist-fecha">'+fmtFecha(h.fecha)+'</div>' +
    '</div>';
  }).join('') : '<div style="font-size:11px;color:var(--gris3)">Sin historial</div>';

  document.getElementById('dpBody').innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
      '<span class="badge-tipo '+(p.tipoProyecto==='supervision'?'superv':'constr')+'" style="font-size:10px">'+(p.tipoProyecto==='supervision'?'Supervisión':'Construcción')+'</span>' +
      '<span class="pill '+sc+'">'+(p.estado||'—')+'</span>' +
      (cPor ? '<span style="font-size:10px;color:var(--gris3)">Creado por <strong style="color:var(--az2)">'+cPor.usuario+'</strong></span>' : '') +
    '</div>' +
    (uMod ? '<div style="background:var(--amarillo-l);border-radius:5px;padding:6px 10px;margin-bottom:10px;font-size:10px;color:var(--amarillo)">Última modificación por <strong>'+uMod.usuario+'</strong> · '+fmtFecha(uMod.fecha)+'</div>' : '') +
    '<div class="dp-section"><div class="dp-section-title">Identificación</div>' +
      dpRow('N° Proceso', p.nProceso) + dpRow('Descripción', p.descripcion) + dpRow('Longitud', p.longitud ? p.longitud+' km' : null) +
      dpRow('Beneficiarios', p.beneficiarios) + dpRow('Empleados Directos', p.empleadosDirectos) + dpRow('Empleados Indirectos', p.empleadosIndirectos) +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Ubicación</div>' +
      dpRow('Departamento', p.departamento) + dpRow('Municipio', p.municipio) + dpRow('Aldea / Barrio', p.aldeaBarrio) +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Empresa Constructora</div>' +
      dpRow('Empresa', p.constructora) + dpRow('N° Contrato', p.noContrato) + dpRow('Coordinador', p.coordinador) + dpRow('Supervisor de Campo', p.supervisor) +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">'+(p.tipoProyecto==='supervision'?'Empresa Supervisora':'Supervisión')+'</div>' +
      (p.tipoProyecto==='supervision' ?
        dpRow('Empresa Supervisora',p.supervisora)+dpRow('N° Contrato',p.noContratoSup)+
        dpRow('Coordinador',p.coordinador)+
        dpRow('Contratos que supervisa',p.contratosSupervisa)
      :
        '<div class="dp-row"><span class="dl">Tipo</span><span class="dv">'+
        '<span style="background:'+(p.tipoSupervision==='interna'?'var(--verde-l)':'var(--az6)')+';color:'+(p.tipoSupervision==='interna'?'var(--verde)':'var(--az2)')+';padding:2px 8px;border-radius:8px;font-size:10px">'+(p.tipoSupervision==='interna'?'Supervisión Interna DGCV':'Supervisión Externa')+'</span></span></div>'+
        (p.tipoSupervision!=='interna' ? dpRow('Empresa Supervisora',p.supervisora)+dpRow('N° Contrato',p.noContratoSup) : '') +
        dpRow('Supervisor de Campo',p.supervisorCampo)
      ) +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Fechas y Plazo</div>' +
      dpRow('Fecha Adjudicación', p.fechaAdjudicacion) + dpRow('Fecha de Contrato', p.fechaContrato) +
      dpRow('Plazo', p.plazo ? p.plazo+' días' : null) + dpRow('Fecha de Inicio', p.fechaInicio) + dpRow('Fecha de Finalización', p.fechaFinObra) +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Garantías</div>' +
      (p.nFianzaAnticipo ? '<div style="background:var(--az7);border-radius:4px;padding:6px 8px;margin-bottom:5px;font-size:11px"><div style="font-weight:600;color:var(--az2);font-size:10px;margin-bottom:2px">ANTICIPO</div>'+dpRow('N°',p.nFianzaAnticipo)+dpRow('Vigencia',p.iniFA+' → '+p.finFA)+dpRow('Monto','L '+fmtL(p.montoFianzaAnticipo))+'</div>' : '') +
      (p.nFianzaCumplimiento ? '<div style="background:var(--verde-l);border-radius:4px;padding:6px 8px;margin-bottom:5px;font-size:11px"><div style="font-weight:600;color:var(--verde);font-size:10px;margin-bottom:2px">CUMPLIMIENTO</div>'+dpRow('N°',p.nFianzaCumplimiento)+dpRow('Vigencia',p.iniFC+' → '+p.finFC)+dpRow('Monto','L '+fmtL(p.montoFianzaCumplimiento))+'</div>' : '') +
      (p.nFianzaCalidad ? '<div style="background:#FDF3E3;border-radius:4px;padding:6px 8px;margin-bottom:5px;font-size:11px"><div style="font-weight:600;color:var(--amarillo);font-size:10px;margin-bottom:2px">CALIDAD</div>'+dpRow('N°',p.nFianzaCalidad)+dpRow('Vigencia',p.iniFCal+' → '+p.finFCal)+dpRow('Monto','L '+fmtL(p.montoFianzaCalidad))+'</div>' : '') +
      (!p.nFianzaAnticipo&&!p.nFianzaCumplimiento&&!p.nFianzaCalidad ? '<div style="font-size:11px;color:var(--gris3)">Sin garantías registradas</div>' : '') +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Información Financiera</div>' +
      dpRow('Monto de Contrato', 'L '+fmtL(p.montoContratoInicial)) +
      (p.montoModificacion ? dpRow('Modificación / Adenda','<span style="color:var(--amarillo)">L '+fmtL(p.montoModificacion)+'</span>') : '') +
      dpRow('Total Devengado', 'L '+fmtL(p.totalDevengado)) +
      dpRow('Deuda Pendiente', '<span style="color:'+(parseFloat(p.deuda)<0?'var(--rojo)':'inherit')+'">L '+fmtL(p.deuda)+'</span>') +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Avance del Proyecto</div>' +
      '<div class="avance-block">' +
        '<div class="avance-row"><div class="avance-label"><span>Avance Físico</span><span style="color:var(--az2);font-weight:500">'+af.toFixed(1)+'%</span></div><div class="avance-track"><div class="avance-fill" style="width:'+Math.min(af,100)+'%;background:var(--az3)"></div></div></div>' +
        '<div class="avance-row"><div class="avance-label"><span>Avance Financiero <span style="font-size:9px;color:var(--gris3)">(calculado)</span></span><span style="color:var(--verde);font-weight:500">'+afin.toFixed(1)+'%</span></div><div class="avance-track"><div class="avance-fill" style="width:'+Math.min(afin,100)+'%;background:var(--verde)"></div></div></div>' +
      '</div>' +
    '</div>' +
    '<div class="dp-section"><div class="dp-section-title">Pagos ('+(p.pagos||[]).length+')</div>' + pagosHtml + '</div>' +
    '<div class="dp-section"><div class="dp-section-title" style="display:flex;justify-content:space-between"><span>Historial de Cambios</span><span style="font-size:9px;color:var(--gris3);font-weight:400">Clic para ver detalle</span></div>' + histHtml + '</div>';

  document.getElementById('detailOverlay').classList.add('open');
}

function dpRow(label, val) {
  var v = (val === null || val === undefined || val === '') ? '—' : val;
  return '<div class="dp-row"><span class="dl">'+label+'</span><span class="dv">'+v+'</span></div>';
}

function toggleHistDetail(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function closeDetail(e) {
  if (e && e.target !== document.getElementById('detailOverlay')) return;
  document.getElementById('detailOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
//  FORMULARIO — ABRIR
// ═══════════════════════════════════════════════════════════
function openForm(u, idx) {
  var proj = (idx !== null && idx !== undefined) ? (DB[u] || [])[idx] : null;
  var perms = getPerms(u, proj);
  var isNew = (idx === null || idx === undefined);
  if (isNew && !perms.canAdd)   { showToast('No tiene permiso para agregar proyectos en esta unidad.', 'err'); return; }
  if (!isNew && !perms.canEdit) { showToast('No tiene permiso para editar este proyecto.', 'err'); return; }

  editingId = { u: u, idx: idx, tipo: null };
  endosoCount = 0; pagoCount = 0;
  cargarContratosSupervision();

  var p = proj || {};

  document.getElementById('modalTitle').textContent =
    (isNew ? 'Nuevo Proyecto' : 'Editar Proyecto') + ' — ' + UNIDADES[u].nombre;

  if (isNew) {
    var btnGuardar = document.querySelector('.modal-footer .btn-primary');
    if (btnGuardar) btnGuardar.style.display = 'none';
    document.getElementById('modalBody').innerHTML = buildTipoSelector();
    document.getElementById('modalOverlay').classList.add('open');
    return;
  }

  // Modo edición: usar tipo existente
  var tipo = p.tipoProyecto || 'construccion';
  editingId.tipo = tipo;

  var titulo = tipo === 'supervision' ? 'Editar Contrato de Supervisión' : 'Editar Proyecto de Construcción';
  document.getElementById('modalTitle').textContent = titulo + ' — ' + UNIDADES[u].nombre;
  var btnGuardar = document.querySelector('.modal-footer .btn-primary');
  if (btnGuardar) btnGuardar.style.display = '';

  function fv(field) {
    var v = p[field];
    if (v === null || v === undefined) return '';
    return String(v).replace(/"/g, '&quot;');
  }
  var deptoOpts  = DEPTOS.map(function(d)  { return '<option'+(p.departamento===d?' selected':'')+'>'+d+'</option>'; }).join('');
  var estadoOpts = ESTADOS.map(function(e) { return '<option'+(p.estado===e?' selected':'')+'>'+e+'</option>'; }).join('');

  if (tipo === 'supervision') {
    document.getElementById('modalBody').innerHTML = buildFormSupervision(u, p, fv, estadoOpts, deptoOpts);
  } else {
    document.getElementById('modalBody').innerHTML = buildFormConstruccion(u, p, fv, estadoOpts, deptoOpts);
    toggleSup(p.tipoSupervision || 'externa');
    var selSup = document.getElementById('f_contratoSupervisionId');
    if (selSup && p.contratoSupervisionId) {
      selSup.value = p.contratoSupervisionId;
      onSelectContratoSupervision(selSup);
    }
  }

  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(syncEstadoAvance, 0);
  (p.endosos || []).forEach(function(e)  { addEndoso(e); });
  (p.pagos   || []).forEach(function(pg) { addPago(pg); });
  if (!(p.pagos||[]).length) addPago();
  updateFianzaOpts();
  recalcPagos();
}


// ── Supervisión toggle ──────────────────
function toggleSup(tipo) {
  var extF = document.getElementById('sup-ext-fields');
  var intF = document.getElementById('sup-int-fields');
  var lE   = document.getElementById('lbl-sup-ext');
  var lI   = document.getElementById('lbl-sup-int');
  if (extF) extF.style.display = tipo === 'externa' ? 'block' : 'none';
  if (intF) intF.style.display = tipo === 'interna' ? 'block' : 'none';
  if (lE)  { lE.style.borderColor = tipo==='externa' ? 'var(--az4)' : 'var(--border)'; lE.style.background = tipo==='externa' ? 'var(--az7)' : '#fff'; }
  if (lI)  { lI.style.borderColor = tipo==='interna' ? 'var(--az4)' : 'var(--border)'; lI.style.background = tipo==='interna' ? 'var(--az7)' : '#fff'; }
}

function clampPct(inp) {
  var v = parseFloat(inp.value);
  if (!isNaN(v)) { if(v<0) inp.value=0; if(v>100) inp.value=100; }
}

// ── Condición 1: sincronización bidireccional estado ↔ avance físico ──
function syncEstadoAvance() {
  // "Terminado" seleccionado → fuerza avance a 100%
  var est = (document.getElementById('f_estado') || {}).value;
  var inp = document.getElementById('f_avanceFisico');
  if (!inp) return;
  if (est === 'Terminado') {
    inp.value = '100';
    updateAvBar();
  }
}

function syncAvanceEstado() {
  // Avance llega a 100% → cambia estado a "Terminado"
  // Avance baja de 100% estando en "Terminado" → regresa a "En Ejecución"
  var inp = document.getElementById('f_avanceFisico');
  var sel = document.getElementById('f_estado');
  if (!inp || !sel) return;
  var v = parseFloat(inp.value);
  if (v >= 100) {
    sel.value = 'Terminado';
  } else if (sel.value === 'Terminado' && v < 100) {
    sel.value = 'En Ejecución';
  }
}

function updateAvBar() {
  var v = parseFloat(document.getElementById('f_avanceFisico').value) || 0;
  var b = document.getElementById('avf-bar');
  var l = document.getElementById('avf-lbl');
  if (b) b.style.width = Math.min(v,100) + '%';
  if (l) l.textContent = v + '%';
}

// ── Garantías / Endosos ─────────────────
function getFianzaOpts(selected) {
  var ids   = ['f_nFianzaAnticipo','f_nFianzaCumplimiento','f_nFianzaCalidad'];
  var labels= ['Anticipo','Cumplimiento','Calidad'];
  var opts  = '<option value="">— Seleccione fianza —</option>';
  ids.forEach(function(id, i) {
    var val = (document.getElementById(id)||{}).value || '';
    if (val) opts += '<option value="'+val+'"'+(selected===val?' selected':'')+'>'+val+' ('+labels[i]+')</option>';
  });
  return opts;
}

function updateFianzaOpts() {
  document.querySelectorAll('.endoso-fianza-select').forEach(function(sel) {
    var cur = sel.value; sel.innerHTML = getFianzaOpts(cur);
  });
}

function addEndoso(data) {
  data = data || {};
  endosoCount++;
  var n   = endosoCount;
  var con = document.getElementById('endosos-container');
  var div = document.createElement('div');
  div.className = 'endoso-card'; div.id = 'endoso-' + n;
  div.innerHTML =
    '<div class="endoso-tag">Endoso N° '+n+'</div>' +
    '<button class="endoso-remove" onclick="document.getElementById(\'endoso-'+n+'\').remove()">✕</button>' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>N° Endoso</label><input type="text" class="end-num" value="'+(data.numEndoso||'')+'"/></div>' +
      '<div class="form-group"><label>Garantía vinculada</label><select class="endoso-fianza-select">'+getFianzaOpts(data.fianzaVinculada||'')+'</select></div>' +
      '<div class="form-group"><label>Fecha del Endoso</label><input type="date" class="end-fecha" value="'+(data.fechaEndoso||'')+'"/></div>' +
      '<div class="form-group"><label>Nueva Fecha Vencimiento</label><input type="date" class="end-fechaVenc" value="'+(data.nuevaFechaVenc||'')+'"/></div>' +
      '<div class="form-group"><label>Monto (L)</label><input type="number" class="end-monto" value="'+(data.montoEndoso||'')+'" step="0.01" min="0" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\')"/></div>' +
      '<div class="form-group"><label>Descripción / Motivo</label><input type="text" class="end-desc" value="'+(data.descripcionEndoso||'')+'"/></div>' +
    '</div>';
  con.appendChild(div);
}

// ── Pagos ───────────────────────────────
function addPago(data) {
  data = data || {};
  pagoCount++;
  var n   = pagoCount;
  var con = document.getElementById('pagos-container');
  var div = document.createElement('div');
  div.className = 'pago-card'; div.id = 'pago-' + n;
  div.innerHTML =
    '<div class="pago-num">Pago N° '+n+'</div>' +
    '<button class="pago-remove" onclick="document.getElementById(\'pago-'+n+'\').remove();recalcPagos()">✕</button>' +
    '<div class="form-grid g2" style="margin-bottom:8px">' +
      '<div class="form-group"><label>Monto del Pago (L)</label><input type="number" class="pago-monto" value="'+(data.monto||'')+'" step="0.01" min="0" placeholder="0.00" oninput="this.value=this.value.replace(/[^0-9.]/g,\'\');recalcPagos()"/></div>' +
      '<div class="form-group"><label>Fecha de Ingreso / Registro</label><input type="date" class="pago-fechaIngreso" value="'+(data.fechaIngreso||data.fecha||'')+'"/></div>' +
    '</div>' +
    '<div class="form-grid g3">' +
      '<div class="form-group"><label>Período — Fecha Inicio</label><input type="date" class="pago-periodoIni" value="'+(data.periodoIni||'')+'"/></div>' +
      '<div class="form-group"><label>Período — Fecha Fin</label><input type="date" class="pago-periodoFin" value="'+(data.periodoFin||'')+'"/></div>' +
      '<div class="form-group"><label>Contexto / Descripción</label><input type="text" class="pago-ctx" value="'+(data.contexto||'')+'" placeholder="Ej. Anticipo, Estimación N°1…"/></div>' +
    '</div>';
  con.appendChild(div);
  recalcPagos();
}

function recalcPagos() {
  var mI  = parseFloat((document.getElementById('f_montoContratoInicial')||{}).value) || 0;
  var mM  = parseFloat((document.getElementById('f_montoModificacion')||{}).value)    || 0;
  var vig = mM > 0 ? mM : mI;
  var dev = 0;
  document.querySelectorAll('#pagos-container .pago-monto').forEach(function(i) { dev += parseFloat(i.value) || 0; });
  var deuda = vig - dev;
  var pct   = vig > 0 ? (dev / vig * 100) : 0;
  var fmt   = function(n) { return n.toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var tc=document.getElementById('tot-contrato');   if(tc) tc.textContent  = 'L ' + fmt(vig);
  var td=document.getElementById('tot-devengado');  if(td) td.textContent  = 'L ' + fmt(dev);
  var tdd=document.getElementById('tot-deuda');     if(tdd){ tdd.textContent = 'L ' + fmt(deuda); tdd.style.color = deuda < 0 ? 'var(--rojo)' : 'var(--az1)'; }
  var tp=document.getElementById('tot-pct');        if(tp) tp.textContent  = pct.toFixed(2) + '%';
}

// ═══════════════════════════════════════════════════════════
//  FORMULARIO — GUARDAR
// ═══════════════════════════════════════════════════════════
function saveProject() {
  var u    = editingId.u;
  var idx  = editingId.idx;
  var tipo = editingId.tipo || 'construccion';
  function g(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  var endosos = [];
  document.querySelectorAll('#endosos-container .endoso-card').forEach(function(card) {
    var e = {
      numEndoso:         (card.querySelector('.end-num')            ||{}).value||'',
      fianzaVinculada:   (card.querySelector('.endoso-fianza-select')||{}).value||'',
      fechaEndoso:       (card.querySelector('.end-fecha')          ||{}).value||'',
      nuevaFechaVenc:    (card.querySelector('.end-fechaVenc')       ||{}).value||'',
      montoEndoso:       (card.querySelector('.end-monto')          ||{}).value||'',
      descripcionEndoso: (card.querySelector('.end-desc')           ||{}).value||''
    };
    if (e.numEndoso || e.fianzaVinculada) endosos.push(e);
  });

  var pagos = [];
  document.querySelectorAll('#pagos-container .pago-card').forEach(function(card) {
    var pg = {
      monto:        (card.querySelector('.pago-monto')       ||{}).value||'',
      fechaIngreso: (card.querySelector('.pago-fechaIngreso')||{}).value||'',
      periodoIni:   (card.querySelector('.pago-periodoIni')  ||{}).value||'',
      periodoFin:   (card.querySelector('.pago-periodoFin')  ||{}).value||'',
      contexto:     (card.querySelector('.pago-ctx')         ||{}).value||''
    };
    if (pg.monto) pagos.push(pg);
  });

  var mI    = parseFloat(g('f_montoContratoInicial')) || 0;
  var mM    = parseFloat(g('f_montoModificacion'))    || 0;
  var vig   = mM > 0 ? mM : mI;
  var dev   = pagos.reduce(function(a,pg){ return a + (parseFloat(pg.monto)||0); }, 0);
  var avFin = vig > 0 ? parseFloat((dev/vig*100).toFixed(2)) : 0;

  var prevProj = idx !== null ? DB[u][idx] : null;
  var proj;

  // ════════════════════════════════════════════════════════
  //  RUTA: SUPERVISIÓN
  // ════════════════════════════════════════════════════════
  if (tipo === 'supervision') {
    var errs = [];
    if (!g('f_nProceso'))         errs.push('N° Proceso');
    if (!g('f_estado'))           errs.push('Estado');
    if (!g('f_proyecto'))         errs.push('Nombre del Contrato');
    if (!g('f_descripcion'))      errs.push('Alcance de la Supervisión');
    if (!g('f_departamento'))     errs.push('Departamento');
    if (!g('f_municipio'))        errs.push('Municipio');
    if (!g('f_aldeaBarrio'))      errs.push('Aldea / Barrio');
    if (!g('f_supervisora'))      errs.push('Empresa Supervisora');
    if (!g('f_noContratoSup'))    errs.push('N° Contrato de Supervisión');
    if (!g('f_fechaAdjudicacion'))errs.push('Fecha de Adjudicación');
    var avF = parseFloat(g('f_avanceFisico'));
    if (g('f_avanceFisico')===''||isNaN(avF)||avF<0||avF>100) errs.push('Avance de Ejecución (0–100%)');
    if (errs.length) { showToast('Campos obligatorios incompletos: ' + errs.join(' · '), 'err'); return; }

    var cambiosSup = [];
    if (prevProj) {
      var camposSup = { proyecto:'Nombre',estado:'Estado',supervisora:'Empresa Supervisora',noContratoSup:'N° Contrato' };
      Object.keys(camposSup).forEach(function(k) {
        var prev = String(prevProj[k]||''); var curr = g('f_'+k);
        if (prev !== curr) cambiosSup.push(camposSup[k]+': "'+prev+'" → "'+curr+'"');
      });
      if (!cambiosSup.length) cambiosSup.push('Sin cambios detectados');
    } else {
      cambiosSup.push('Contrato de supervisión creado · '+pagos.length+' pago(s)');
    }

    proj = {
      tipoProyecto:        'supervision',
      nProceso:            g('f_nProceso'),
      proyecto:            g('f_proyecto'),
      descripcion:         g('f_descripcion'),
      estado:              g('f_estado'),
      departamento:        g('f_departamento'),
      municipio:           g('f_municipio'),
      aldeaBarrio:         g('f_aldeaBarrio'),
      supervisora:         g('f_supervisora'),
      noContratoSup:       g('f_noContratoSup'),
      coordinador:         g('f_coordinador'),
      contratosSupervisa:  g('f_contratosSupervisa'),
      fechaAdjudicacion:   g('f_fechaAdjudicacion'),
      fechaContrato:       g('f_fechaContrato'),
      plazo:               g('f_plazo'),
      fechaInicio:         g('f_fechaInicio'),
      fechaFinObra:        g('f_fechaFinObra'),
      nFianzaAnticipo:     g('f_nFianzaAnticipo'),     iniFA:   g('f_iniFA'),   finFA:   g('f_finFA'),   montoFianzaAnticipo:     g('f_montoFianzaAnticipo'),
      nFianzaCumplimiento: g('f_nFianzaCumplimiento'), iniFC:   g('f_iniFC'),   finFC:   g('f_finFC'),   montoFianzaCumplimiento: g('f_montoFianzaCumplimiento'),
      nFianzaCalidad:      g('f_nFianzaCalidad'),      iniFCal: g('f_iniFCal'), finFCal: g('f_finFCal'), montoFianzaCalidad:      g('f_montoFianzaCalidad'),
      endosos:             endosos,
      montoContratoInicial: g('f_montoContratoInicial'),
      montoModificacion:    g('f_montoModificacion'),
      avanceFisico:         g('f_avanceFisico'),
      avanceFinanciero:     String(avFin),
      pagos:                pagos,
      totalDevengado:       dev.toFixed(2),
      deuda:                (vig - dev).toFixed(2),
      historial: (prevProj ? (prevProj.historial||[]) : []).concat([{
        fecha: new Date().toISOString(), usuario: currentUser.nombre, unidad: currentUser.rol,
        accion: prevProj ? 'Actualización' : 'Creación', cambios: cambiosSup
      }]),
      _saved: new Date().toISOString(), _unidad: u,
      _sid: prevProj ? prevProj._sid : undefined
    };

  // ════════════════════════════════════════════════════════
  //  RUTA: CONSTRUCCIÓN
  // ════════════════════════════════════════════════════════
  } else {
    var tipoSup = (document.querySelector('[name="tipoSup"]:checked') || {}).value || 'externa';
    var supContrato = null;
    if (tipoSup === 'externa') {
      var supId = g('f_contratoSupervisionId');
      if (supId) supContrato = contratosSupervision.filter(function(s){ return s._sid === supId; })[0] || null;
    }

    var errs = [];
    if (!g('f_nProceso'))          errs.push('N° Proceso de Contratación');
    if (!g('f_estado'))            errs.push('Estado del Proyecto');
    if (!g('f_proyecto'))          errs.push('Nombre del Proyecto');
    if (!g('f_descripcion'))       errs.push('Descripción / Alcance');
    if (!g('f_longitud'))          errs.push('Longitud (km)');
    if (!g('f_departamento'))      errs.push('Departamento');
    if (!g('f_municipio'))         errs.push('Municipio');
    if (!g('f_aldeaBarrio'))       errs.push('Aldea / Barrio / Caserío');
    if (!g('f_latitud'))           errs.push('Latitud GPS');
    if (!g('f_longitudRef'))       errs.push('Longitud GPS');
    if (!g('f_constructora'))      errs.push('Empresa Constructora');
    if (!g('f_coordinador'))       errs.push('Nombre del Coordinador');
    if (tipoSup === 'interna' && !g('f_supervisorCampo')) errs.push('Nombre del Supervisor de Campo');
    if (tipoSup === 'externa' && contratosSupervision.length > 0 && !g('f_contratoSupervisionId')) errs.push('Contrato de Supervisión Externa');
    if (!g('f_fechaAdjudicacion')) errs.push('Fecha de Adjudicación');
    var avF = parseFloat(g('f_avanceFisico'));
    if (g('f_avanceFisico')===''||isNaN(avF)||avF<0||avF>100) errs.push('Avance Físico (0–100%)');
    if (errs.length) {
      showToast('Campos obligatorios incompletos: ' + errs.join(' · '), 'err');
      ['f_nProceso','f_estado','f_proyecto','f_descripcion','f_longitud',
       'f_departamento','f_municipio','f_aldeaBarrio','f_latitud','f_longitudRef',
       'f_constructora','f_coordinador','f_fechaAdjudicacion','f_avanceFisico'
      ].forEach(function(id) {
        var el = document.getElementById(id); if (!el) return;
        var empty = id==='f_avanceFisico' ? (el.value===''||isNaN(parseFloat(el.value))) : !el.value;
        el.style.borderColor = empty ? 'var(--rojo)' : '';
        el.style.background  = empty ? 'var(--rojo-l)' : '';
        if (empty) el.addEventListener('input', function fix(){ el.style.borderColor=''; el.style.background=''; el.removeEventListener('input',fix); });
      });
      return;
    }

    var cambios = [];
    if (prevProj) {
      var campos = { proyecto:'Nombre',estado:'Estado',constructora:'Constructora',departamento:'Dpto',avanceFisico:'Av. Físico',montoContratoInicial:'Monto Contrato' };
      Object.keys(campos).forEach(function(k) {
        var prev = String(prevProj[k]||''); var curr = g('f_'+k);
        if (prev !== curr) cambios.push(campos[k]+': "'+prev+'" → "'+curr+'"');
      });
      if ((prevProj.pagos||[]).length !== pagos.length) cambios.push('Pagos: '+(prevProj.pagos||[]).length+' → '+pagos.length);
      if ((prevProj.endosos||[]).length !== endosos.length) cambios.push('Endosos: '+(prevProj.endosos||[]).length+' → '+endosos.length);
      if (!cambios.length) cambios.push('Sin cambios detectados en campos principales');
    } else {
      cambios.push('Proyecto creado · '+pagos.length+' pago(s) · '+endosos.length+' endoso(s)');
    }

    proj = {
      tipoProyecto:        'construccion',
      nProceso:            g('f_nProceso'),
      proyecto:            g('f_proyecto'),
      descripcion:         g('f_descripcion'),
      estado:              g('f_estado'),
      longitud:            g('f_longitud'),
      beneficiarios:       g('f_beneficiarios'),
      empleadosDirectos:   g('f_empleadosDirectos'),
      empleadosIndirectos: g('f_empleadosIndirectos'),
      departamento:        g('f_departamento'),
      municipio:           g('f_municipio'),
      aldeaBarrio:         g('f_aldeaBarrio'),
      latitud:             g('f_latitud'),
      longitudRef:         g('f_longitudRef'),
      constructora:        g('f_constructora'),
      noContrato:          g('f_noContrato'),
      coordinador:         g('f_coordinador'),
      tipoSupervision:     tipoSup,
      contratoSupervisionId: tipoSup==='externa' ? g('f_contratoSupervisionId') : '',
      supervisora:         tipoSup==='externa' ? (supContrato ? supContrato.supervisora : g('f_supervisora')||'') : 'Supervisión Interna DGCV',
      noContratoSup:       tipoSup==='externa' ? (supContrato ? supContrato.noContratoSup : '') : '',
      supervisorCampo:     tipoSup==='interna' ? g('f_supervisorCampo') : (supContrato ? (supContrato.supervisorCampo||'') : ''),
      fechaAdjudicacion:   g('f_fechaAdjudicacion'),
      fechaContrato:       g('f_fechaContrato'),
      plazo:               g('f_plazo'),
      fechaInicio:         g('f_fechaInicio'),
      fechaFinObra:        g('f_fechaFinObra'),
      nFianzaAnticipo:     g('f_nFianzaAnticipo'),     iniFA:   g('f_iniFA'),   finFA:   g('f_finFA'),   montoFianzaAnticipo:     g('f_montoFianzaAnticipo'),
      nFianzaCumplimiento: g('f_nFianzaCumplimiento'), iniFC:   g('f_iniFC'),   finFC:   g('f_finFC'),   montoFianzaCumplimiento: g('f_montoFianzaCumplimiento'),
      nFianzaCalidad:      g('f_nFianzaCalidad'),      iniFCal: g('f_iniFCal'), finFCal: g('f_finFCal'), montoFianzaCalidad:      g('f_montoFianzaCalidad'),
      endosos:             endosos,
      montoContratoInicial: g('f_montoContratoInicial'),
      montoModificacion:    g('f_montoModificacion'),
      avanceFisico:         g('f_avanceFisico'),
      avanceFinanciero:     String(avFin),
      pagos:                pagos,
      totalDevengado:       dev.toFixed(2),
      deuda:                (vig - dev).toFixed(2),
      historial: (prevProj ? (prevProj.historial||[]) : []).concat([{
        fecha: new Date().toISOString(), usuario: currentUser.nombre, unidad: currentUser.rol,
        accion: prevProj ? 'Actualización' : 'Creación', cambios: cambios
      }]),
      _saved: new Date().toISOString(), _unidad: u,
      _sid: prevProj ? prevProj._sid : undefined
    };
  }

  if (idx === null) DB[u].push(proj);
  else DB[u][idx] = proj;

  closeModal();
  updateBadges();
  endosoCount = 0; pagoCount = 0;

  var isNew = idx === null;
  showView(u, document.getElementById('nav-' + u));
  showBanner(isNew ? '✓ Registro guardado exitosamente' : '✓ Registro actualizado correctamente');

  persistirProyecto(u, proj)
    .then(function(newId) {
      if (isNew) {
        var localIdx = DB[u].length - 1;
        if (DB[u][localIdx] && !DB[u][localIdx]._sid) { DB[u][localIdx]._sid = newId; proj._sid = newId; }
      }
      saveLocalDB();
      showToast('✓ Guardado en base de datos Supabase.', 'ok');
    })
    .catch(function(e) {
      saveLocalDB();
      var msg = 'Error al guardar en BD: ' + e.message;
      showToast(msg, 'err');
      setTimeout(function() { alert('⚠️ ' + msg + '\n\nEl proyecto quedó guardado localmente pero NO en Supabase.\nRevise la conexión.'); }, 500);
    });
}

// ═══════════════════════════════════════════════════════════
//  ELIMINAR PROYECTO
// ═══════════════════════════════════════════════════════════
function deleteProject(u, i) {
  var proj = DB[u][i];
  if (!proj) return;
  var perms = getPerms(u, proj);
  if (!perms.canDelete) { showToast('No tiene permiso para eliminar este proyecto.', 'err'); return; }
  if (!confirm('¿Confirma eliminar "' + proj.proyecto + '"?\nEsta acción no se puede deshacer.')) return;
  var sid = proj._sid;
  DB[u].splice(i, 1);
  saveLocalDB();
  updateBadges();
  renderUnidad(u);
  showToast('Proyecto eliminado.', 'ok');
  if (sid) {
    supaDelete('proyectos', sid).catch(function(e) {
      showToast('Eliminado localmente pero error en BD: ' + e.message, 'err');
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  MODALES — CERRAR
// ═══════════════════════════════════════════════════════════
function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null; endosoCount = 0; pagoCount = 0;
}
function closeDetail(e) {
  if (e && e.target !== document.getElementById('detailOverlay')) return;
  document.getElementById('detailOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
//  RECARGAR DESDE SUPABASE
// ═══════════════════════════════════════════════════════════
function recargarDesdeSupabase() {
  var btn = document.getElementById('syncBtn');
  if (btn) { btn.textContent = 'Cargando...'; btn.disabled = true; }
  cargarProyectos().then(function() {
    saveLocalDB();
    updateBadges();
    if (currentView === 'dashboard') renderDashboard();
    else renderUnidad(currentView);
    if (btn) { btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 116 2" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M6 2l2-2M6 2L4 0" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Recargar datos'; btn.disabled = false; }
    showToast(dbOnline ? 'Datos actualizados desde la base de datos.' : 'Sin conexión a la base de datos.', dbOnline ? 'ok' : 'err');
  });
}

// ═══════════════════════════════════════════════════════════
//  GESTIÓN DE USUARIOS (solo admin)
// ═══════════════════════════════════════════════════════════
function renderUsuariosPanel() {
  if (!currentUser || !currentUser.esGlobalAdmin) {
    document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p>Acceso restringido.</p></div>';
    return;
  }
  document.getElementById('mainContent').innerHTML =
    '<div class="page-header"><h2>Gestión de Usuarios</h2>' +
    '<p>Administre los accesos al sistema. Las contraseñas se gestionan con Supabase Auth (bcrypt).</p>' +
    '<div class="page-actions"><button class="btn btn-primary" onclick="abrirModalUsuario()">+ Nuevo Usuario</button></div></div>' +
    '<div style="background:var(--az7);border:1px solid var(--az6);border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--az2);display:flex;align-items:center;gap:8px;">' +
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 6v4M7 4.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      'Las contraseñas se almacenan con <strong>bcrypt</strong> en Supabase Auth — nunca son visibles ni en el código ni en la base de datos.' +
    '</div>' +
    '<div class="table-wrap"><div class="table-toolbar"><h3>Usuarios registrados</h3></div>' +
    '<div id="tablaUsuarios"><div class="empty-state"><p>Cargando...</p></div></div></div>';
  cargarTablaUsuarios();
}

async function cargarTablaUsuarios() {
  try {
    var rows = await supaGet('usuarios', 'select=*&order=unidad.asc,nombre.asc');
    if (!rows || rows.length === 0) {
      document.getElementById('tablaUsuarios').innerHTML = '<div class="empty-state"><p>No hay usuarios registrados.</p></div>';
      return;
    }
    var tbody = rows.map(function(u) {
      var estadoPill = u.activo ? '<span class="pill ejec">Activo</span>' : '<span class="pill susp">Inactivo</span>';
      return '<tr>' +
        '<td style="font-family:var(--mono);font-size:11px">' + (u.email || '—') + '</td>' +
        '<td>' + u.nombre + '</td>' +
        '<td>' + (UNIDAD_NOMBRES[u.unidad] || u.unidad) + '</td>' +
        '<td>' + (u.rol === 'admin' ? 'Administrador' : 'Coordinador') + '</td>' +
        '<td>' + estadoPill + '</td>' +
        '<td><div class="tbl-actions">' +
          '<button class="tbl-btn edit" onclick="abrirModalUsuario(\'' + u.id + '\')">Editar</button>' +
          '<button class="tbl-btn" onclick="cambiarEstadoUsuario(\'' + u.id + '\',' + !u.activo + ')">' + (u.activo ? 'Desactivar' : 'Activar') + '</button>' +
          '<button class="tbl-btn" style="color:var(--az2)" onclick="enviarResetPassword(\'' + (u.email||'') + '\')">Reset contraseña</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
    document.getElementById('tablaUsuarios').innerHTML =
      '<table class="tbl"><thead><tr>' +
        '<th>Correo</th><th>Nombre</th><th>Unidad</th><th>Rol</th><th>Estado</th><th>Acciones</th>' +
      '</tr></thead><tbody>' + tbody + '</tbody></table>';
  } catch(e) {
    document.getElementById('tablaUsuarios').innerHTML = '<div class="empty-state"><p>Error: ' + e.message + '</p></div>';
  }
}

function abrirModalUsuario(id) {
  var esEdicion = !!id;
  var body =
    '<div class="form-section">' +
    '<div class="form-grid g2">' +
      '<div class="form-group"><label>Nombre completo <span class="req">*</span></label>' +
        '<input type="text" id="u_nombre" placeholder="Ej: Juan Pérez"/></div>' +
      '<div class="form-group"><label>Correo electrónico <span class="req">*</span></label>' +
        '<input type="email" id="u_email" placeholder="coordinador@sit.gob.hn"' +
        (esEdicion ? ' readonly style="background:var(--gris6)"' : '') + '/></div>' +
    '</div>' +
    '<div class="form-grid g2" style="margin-top:12px">' +
      '<div class="form-group"><label>Unidad <span class="req">*</span></label>' +
        '<select id="u_unidad"><option value="">— Seleccione —</option>' +
        Object.entries(UNIDAD_NOMBRES).map(function(e){ return '<option value="'+e[0]+'">'+e[1]+'</option>'; }).join('') +
        '</select></div>' +
      '<div class="form-group"><label>Rol <span class="req">*</span></label>' +
        '<select id="u_rol"><option value="coordinador">Coordinador</option><option value="admin">Administrador</option></select></div>' +
    '</div>' +
    (!esEdicion ?
      '<div class="form-grid g2" style="margin-top:12px">' +
        '<div class="form-group"><label>Contraseña inicial <span class="req">*</span></label>' +
          '<input type="password" id="u_pass" placeholder="Mínimo 8 caracteres"/>' +
          '<div class="form-hint">El usuario puede cambiarla usando "Reset contraseña"</div></div>' +
        '<div class="form-group"><label>Confirmar contraseña <span class="req">*</span></label>' +
          '<input type="password" id="u_pass2"/></div>' +
      '</div>'
    : '') +
    '</div>';

  document.getElementById('modalTitle').textContent = esEdicion ? 'Editar Usuario' : 'Nuevo Usuario';
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalOverlay').classList.add('open');
  document.querySelector('.modal-footer .btn-primary').onclick = function() { guardarUsuario(id); };

  if (esEdicion) {
    supaGet('usuarios', 'select=*&id=eq.' + id).then(function(rows) {
      if (!rows || !rows[0]) return;
      var u = rows[0];
      document.getElementById('u_nombre').value = u.nombre;
      document.getElementById('u_email').value  = u.email || '';
      document.getElementById('u_unidad').value = u.unidad;
      document.getElementById('u_rol').value    = u.rol;
    });
  }
}

async function guardarUsuario(id) {
  var nombre  = (document.getElementById('u_nombre').value || '').trim();
  var email   = (document.getElementById('u_email').value  || '').trim().toLowerCase();
  var unidad  = document.getElementById('u_unidad').value;
  var rol     = document.getElementById('u_rol').value;
  var esEdicion = !!id;

  if (!nombre || !email || !unidad) { showToast('Complete los campos obligatorios.', 'err'); return; }
  if (!email.includes('@'))          { showToast('Ingrese un correo electrónico válido.', 'err'); return; }

  if (!esEdicion) {
    var pass  = (document.getElementById('u_pass')  || {}).value || '';
    var pass2 = (document.getElementById('u_pass2') || {}).value || '';
    if (pass.length < 8)  { showToast('La contraseña debe tener al menos 8 caracteres.', 'err'); return; }
    if (pass !== pass2)   { showToast('Las contraseñas no coinciden.', 'err'); return; }

    try {
      // 1. Crear cuenta en Supabase Auth
      var signupResp = await fetch(SUPA_AUTH + '/signup', {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass })
      });
      var signupData = await signupResp.json();
      if (!signupResp.ok) {
        var msg = signupData.msg || signupData.error_description || signupData.message || 'Error desconocido';
        showToast('Error Auth: ' + msg, 'err');
        return;
      }

      // 2. Crear perfil en tabla usuarios (SIN username ni password)
      await supaPost('usuarios', {
        id:     genUUID(),
        email:  email,
        nombre: nombre,
        unidad: unidad,
        rol:    rol,
        activo: true
      });

      showToast('Usuario creado. Puede iniciar sesión con ' + email, 'ok');
      closeModal();
      document.querySelector('.modal-footer .btn-primary').onclick = saveProject;
      renderUsuariosPanel();
    } catch(e) {
      showToast('Error al crear usuario: ' + e.message, 'err');
    }

  } else {
    // Editar solo datos del perfil (nombre, unidad, rol)
    try {
      await supaPatch('usuarios', id, { nombre: nombre, unidad: unidad, rol: rol });
      showToast('Perfil actualizado.', 'ok');
      closeModal();
      document.querySelector('.modal-footer .btn-primary').onclick = saveProject;
      renderUsuariosPanel();
    } catch(e) {
      showToast('Error: ' + e.message, 'err');
    }
  }
}

async function cambiarEstadoUsuario(id, nuevoEstado) {
  if (!confirm('¿Confirma ' + (nuevoEstado ? 'activar' : 'desactivar') + ' este usuario?')) return;
  try {
    await supaPatch('usuarios', id, { activo: nuevoEstado });
    showToast('Usuario ' + (nuevoEstado ? 'activado' : 'desactivado') + '.', 'ok');
    cargarTablaUsuarios();
  } catch(e) { showToast('Error: ' + e.message, 'err'); }
}

async function enviarResetPassword(email) {
  if (!email) { showToast('Este usuario no tiene correo registrado.', 'err'); return; }
  if (!confirm('¿Enviar correo de restablecimiento a ' + email + '?')) return;
  try {
    var resp = await fetch(SUPA_AUTH + '/recover', {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    showToast(resp.ok ? 'Correo enviado a ' + email : 'No se pudo enviar el correo.', resp.ok ? 'ok' : 'err');
  } catch(e) { showToast('Error: ' + e.message, 'err'); }
}


// ═══════════════════════════════════════════════════════════
//  FORMATOS — links a Google Drive
// ═══════════════════════════════════════════════════════════
// Para actualizar los links: reemplace el valor de 'url' en cada formato.
// Comparta la carpeta/archivo en Drive como "Cualquiera con el enlace puede ver"
// y copie el link aquí.
var FORMATOS_CONFIG = [
  {
    id:          'estimacion',
    titulo:      'Estimación de Obras',
    descripcion: 'Formato oficial para el trámite y presentación de estimaciones de avance de obras. Incluye desglose por partidas, cantidades ejecutadas y montos correspondientes.',
    clase:       'estimacion',
    iconoBg:     'var(--az7)',
    iconoColor:  'var(--az2)',
    btnClase:    'az',
    badge:       'Obras Civiles',
    badgeBg:     'var(--az7)',
    badgeColor:  'var(--az2)',
    url:         'https://drive.google.com/drive/folders/1zu3ZU46QQVdIZnWWkdgNi265RkWCEwNs?usp=sharing',   // ← Pegue aquí el link de Google Drive
    icono: '<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="2" width="18" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 2l6 6H4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 8h6V2" stroke="currentColor" stroke-width="1.4"/><path d="M8 14h10M8 18h10M8 22h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><rect x="18" y="18" width="10" height="10" rx="2" fill="var(--az6)" stroke="var(--az3)" stroke-width="1.3"/><path d="M21 23h4M23 21v4" stroke="var(--az2)" stroke-width="1.3" stroke-linecap="round"/></svg>'
  },
  {
    id:          'supervision',
    titulo:      'Pago a Supervisores',
    descripcion: 'Formato para solicitud y tramitación de pagos a empresas supervisoras externas. Incluye período de supervisión, porcentaje de avance verificado y monto a pagar.',
    clase:       'supervision',
    iconoBg:     'var(--verde-l)',
    iconoColor:  'var(--verde)',
    btnClase:    'verde',
    badge:       'Supervisión',
    badgeBg:     'var(--verde-l)',
    badgeColor:  'var(--verde)',
    url:         'https://drive.google.com/drive/folders/1Q5QjuCpcjeuLCFoyUBzICHxYftXml3ow?usp=sharing',   // ← Pegue aquí el link de Google Drive
    icono: '<svg viewBox="0 0 32 32" fill="none"><circle cx="13" cy="10" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M4 26c0-5 4-8 9-8s9 3 9 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M21 14l2.5 2.5L28 12" stroke="var(--verde)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="14" r="6" stroke="var(--verde)" stroke-width="1.4"/></svg>'
  },
  {
    id:          'anticipo',
    titulo:      'Anticipo de Obra',
    descripcion: 'Formato para la solicitud de anticipo de contrato. Incluye datos del proyecto, monto total, porcentaje de anticipo solicitado y documentos de garantía requeridos.',
    clase:       'anticipo',
    iconoBg:     'var(--gold6)',
    iconoColor:  'var(--gold1)',
    btnClase:    'gold',
    badge:       'Financiero',
    badgeBg:     'var(--gold6)',
    badgeColor:  'var(--gold1)',
    url:         'https://drive.google.com/drive/folders/1eobYZ5RF4ZxxUHFpB9FTh-7S8QzvbBi-?usp=sharing',   // ← Pegue aquí el link de Google Drive
    icono: '<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.6"/><path d="M16 8v2M16 22v2M12 12.5c0-1.7 1.3-3 4-3s4 1.3 4 3-1.5 2.5-4 3-4 1.5-4 3 1.3 3 4 3 4-1.3 4-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  }
];

function renderFormatosPanel() {
  var tarjetas = FORMATOS_CONFIG.map(function(f) {
    var disponible = f.url && f.url !== 'PENDIENTE';
    var btnHtml = disponible
      ? '<a href="'+f.url+'" target="_blank" rel="noopener" class="btn-formato '+f.btnClase+'">'
          +'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          +'Abrir en Google Drive</a>'
      : '<button class="btn-formato disabled">'
          +'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 4.5V7.5M7 9.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
          +'Link pendiente de configurar</button>';

    return '<div class="formato-card '+f.clase+'">'
      +'<div class="formato-icon" style="background:'+f.iconoBg+';color:'+f.iconoColor+';">'+f.icono+'</div>'
      +'<span class="formato-badge" style="background:'+f.badgeBg+';color:'+f.badgeColor+';">'+f.badge+'</span>'
      +'<h3>'+f.titulo+'</h3>'
      +'<p>'+f.descripcion+'</p>'
      + btnHtml
      +'</div>';
  }).join('');

  var hayPendientes = FORMATOS_CONFIG.some(function(f){ return !f.url || f.url==='PENDIENTE'; });
  var infoBanner = hayPendientes
    ? '<div class="formato-info">'
        +'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--az2)" stroke-width="1.2"/><path d="M8 5v3.5M8 10.5v.5" stroke="var(--az2)" stroke-width="1.3" stroke-linecap="round"/></svg>'
        +'<span><strong>Configuración requerida:</strong> Uno o más formatos no tienen link asignado todavía. Para activarlos, comparta la carpeta o archivo en Google Drive como "Cualquiera con el enlace puede ver", copie el link y péguelo en la variable <code style="background:var(--az6);padding:1px 5px;border-radius:3px;">FORMATOS_CONFIG</code> dentro del código HTML.</span>'
      +'</div>'
    : '';

  document.getElementById('mainContent').innerHTML =
    '<div class="page-header">'
      +'<h2>Formatos Oficiales</h2>'
      +'<p>Descargue los formatos necesarios para trámites administrativos de proyectos viales.</p>'
    +'</div>'
    + infoBanner
    +'<div class="formatos-grid">'+tarjetas+'</div>';
}


function renderEmpresasPanel() {
  if (!currentUser || !currentUser.esGlobalAdmin) {
    document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p>Acceso restringido.</p></div>';
    return;
  }
  var mc = document.getElementById('mainContent');
  mc.innerHTML =
    '<div class="page-header">' +
      '<h2>Gestión de Empresas Precalificadas</h2>' +
      '<p>Administre el catálogo de empresas constructoras y supervisoras.</p>' +
      '<div class="page-actions">' +
        '<button class="btn btn-primary" onclick="abrirModalEmpresa()">+ Nueva Empresa</button>' +
        '<button class="btn btn-outline" onclick="cargarEmpresas().then(cargarTablaEmpresas)">↺ Actualizar</button>' +
      '</div>' +
    '</div>' +
    '<div class="table-wrap">' +
      '<div class="table-toolbar">' +
        '<h3>Empresas registradas</h3>' +
        '<div class="search-box"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="var(--gris3)" stroke-width="1.2"/><path d="M8 8l2.5 2.5" stroke="var(--gris3)" stroke-width="1.2" stroke-linecap="round"/></svg>' +
        '<input type="text" placeholder="Buscar empresa..." oninput="filtrarTablaEmpresas(this.value)"/></div>' +
        '<select class="filter-select" id="filtroTipoEmp" onchange="filtrarTablaEmpresas()">' +
          '<option value="">Todos los tipos</option>' +
          '<option value="constructora">Constructoras</option>' +
          '<option value="supervisora">Supervisoras</option>' +
          '<option value="ambas">Ambas</option>' +
        '</select>' +
      '</div>' +
      '<div id="tablaEmpresas"><div class="empty-state"><p>Cargando...</p></div></div>' +
    '</div>';
  cargarTablaEmpresas();
}

var _todasEmpresas = [];

async function cargarTablaEmpresas() {
  try {
    var rows = await supaGet('empresas', 'select=*&order=tipo.asc,nombre.asc');
    _todasEmpresas = rows || [];
    renderTablaEmpresas(_todasEmpresas);
  } catch(e) {
    var el = document.getElementById('tablaEmpresas');
    if (el) el.innerHTML = '<div class="empty-state"><p>Error al cargar: ' + e.message + '</p></div>';
  }
}

function renderTablaEmpresas(rows) {
  var el = document.getElementById('tablaEmpresas');
  if (!el) return;
  if (!rows || !rows.length) {
    el.innerHTML = '<div class="empty-state"><p>No hay empresas registradas.</p></div>';
    return;
  }
  var tipoPill = {
    constructora: '<span class="pill proc">Constructora</span>',
    supervisora:  '<span class="pill ejec">Supervisora</span>',
    ambas:        '<span class="pill" style="background:var(--gold6);color:var(--gold1);">Ambas</span>'
  };
  var tbody = rows.map(function(e) {
    var estado = e.activa
      ? '<span class="pill ejec">Activa</span>'
      : '<span class="pill susp">Inactiva</span>';
    return '<tr>' +
      '<td style="font-weight:500;font-size:12px;">' + e.nombre + '</td>' +
      '<td>' + (tipoPill[e.tipo] || e.tipo) + '</td>' +
      '<td style="font-size:11px;color:var(--gris2);">' + (e.rtn || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--gris2);">' + (e.representante || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--gris2);">' + (e.telefono || '—') + '</td>' +
      '<td>' + estado + '</td>' +
      '<td><div class="tbl-actions">' +
        '<button class="tbl-btn edit" onclick="abrirModalEmpresa(\'' + e.id + '\')">Editar</button>' +
        '<button class="tbl-btn" onclick="toggleEmpresaActiva(\'' + e.id + '\',' + !e.activa + ')">' + (e.activa ? 'Desactivar' : 'Activar') + '</button>' +
        '<button class="tbl-btn" style="color:var(--rojo)" onclick="eliminarEmpresa(\'' + e.id + '\',\'' + e.nombre.replace(/'/g,"\\'") + '\')">✕</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');

  el.innerHTML =
    '<table class="tbl"><thead><tr>' +
      '<th>Nombre / Razón Social</th><th>Tipo</th><th>RTN</th><th>Representante</th><th>Teléfono</th><th>Estado</th><th>Acciones</th>' +
    '</tr></thead><tbody>' + tbody + '</tbody></table>';
}

function filtrarTablaEmpresas(q) {
  var query = typeof q === 'string' ? q.toLowerCase() : (document.querySelector('#tablaEmpresas')&&''||'');
  var tipo  = (document.getElementById('filtroTipoEmp')||{}).value || '';
  var filtrado = _todasEmpresas.filter(function(e) {
    var matchQ = !query || (e.nombre||'').toLowerCase().includes(query) ||
                 (e.rtn||'').toLowerCase().includes(query) ||
                 (e.representante||'').toLowerCase().includes(query);
    var matchT = !tipo || e.tipo === tipo;
    return matchQ && matchT;
  });
  renderTablaEmpresas(filtrado);
}

function abrirModalEmpresa(id) {
  var esEdicion = !!id;
  document.getElementById('modalTitle').textContent = esEdicion ? 'Editar Empresa' : 'Nueva Empresa';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-section">' +
      '<div class="form-grid g2">' +
        '<div class="form-group span2"><label>Nombre / Razón Social <span class="req">*</span></label>' +
          '<input type="text" id="emp_nombre" placeholder="Nombre completo de la empresa"/></div>' +
        '<div class="form-group"><label>Tipo <span class="req">*</span></label>' +
          '<select id="emp_tipo">' +
            '<option value="constructora">Constructora</option>' +
            '<option value="supervisora">Supervisora</option>' +
            '<option value="ambas">Ambas (Constructora y Supervisora)</option>' +
          '</select></div>' +
        '<div class="form-group"><label>RTN</label>' +
          '<input type="text" id="emp_rtn" placeholder="14 dígitos" maxlength="14" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"/></div>' +
        '<div class="form-group"><label>Representante Legal</label>' +
          '<input type="text" id="emp_representante" placeholder="Nombre completo"/></div>' +
        '<div class="form-group"><label>Teléfono</label>' +
          '<input type="text" id="emp_telefono" placeholder="(504) 0000-0000"/></div>' +
        '<div class="form-group"><label>Correo Electrónico</label>' +
          '<input type="email" id="emp_correo" placeholder="empresa@ejemplo.com"/></div>' +
      '</div>' +
    '</div>';

  document.getElementById('modalOverlay').classList.add('open');
  var btnGuardar = document.querySelector('.modal-footer .btn-primary');
  btnGuardar.onclick = function() { guardarEmpresa(id); };

  if (esEdicion) {
    var emp = _todasEmpresas.find(function(e){ return e.id === id; });
    if (emp) {
      document.getElementById('emp_nombre').value        = emp.nombre        || '';
      document.getElementById('emp_tipo').value          = emp.tipo          || 'constructora';
      document.getElementById('emp_rtn').value           = emp.rtn           || '';
      document.getElementById('emp_representante').value = emp.representante || '';
      document.getElementById('emp_telefono').value      = emp.telefono      || '';
      document.getElementById('emp_correo').value        = emp.correo        || '';
    }
  }
}

async function guardarEmpresa(id) {
  var nombre = (document.getElementById('emp_nombre').value || '').trim();
  var tipo   = document.getElementById('emp_tipo').value;
  if (!nombre) { showToast('El nombre de la empresa es obligatorio.', 'err'); return; }

  var row = {
    nombre:        nombre,
    tipo:          tipo,
    rtn:           (document.getElementById('emp_rtn').value || '').trim() || null,
    representante: (document.getElementById('emp_representante').value || '').trim() || null,
    telefono:      (document.getElementById('emp_telefono').value || '').trim() || null,
    correo:        (document.getElementById('emp_correo').value || '').trim() || null,
  };

  try {
    if (id) {
      await supaPatch('empresas', id, row);
      showToast('Empresa actualizada correctamente.', 'ok');
    } else {
      row.id = genUUID();
      row.activa = true;
      await supaPost('empresas', row);
      showToast('Empresa registrada. Ya disponible en los formularios.', 'ok');
    }
    closeModal();
    document.querySelector('.modal-footer .btn-primary').onclick = saveProject;
    await cargarEmpresas();
    cargarTablaEmpresas();
  } catch(e) {
    showToast('Error al guardar: ' + e.message, 'err');
  }
}

async function toggleEmpresaActiva(id, nuevoEstado) {
  var accion = nuevoEstado ? 'activar' : 'desactivar';
  if (!confirm('¿Confirma ' + accion + ' esta empresa?')) return;
  try {
    await supaPatch('empresas', id, { activa: nuevoEstado });
    showToast('Empresa ' + (nuevoEstado ? 'activada' : 'desactivada') + '.', 'ok');
    await cargarEmpresas();
    cargarTablaEmpresas();
  } catch(e) {
    showToast('Error: ' + e.message, 'err');
  }
}

async function eliminarEmpresa(id, nombre) {
  if (!confirm('¿Eliminar permanentemente "' + nombre + '"?\nEsta acción no se puede deshacer.')) return;
  try {
    await supaDelete('empresas', id);
    showToast('Empresa eliminada.', 'ok');
    await cargarEmpresas();
    cargarTablaEmpresas();
  } catch(e) {
    showToast('Error: ' + e.message, 'err');
  }
}


function actualizarMunicipios(valorActual) {
  var dep = document.getElementById('f_departamento');
  var mun = document.getElementById('f_municipio');
  if (!dep || !mun) return;
  var d    = dep.value;
  var prev = valorActual || mun.value;
  var lista = (d && MUNICIPIOS[d]) ? MUNICIPIOS[d] : [];
  mun.innerHTML = lista.length
    ? '<option value="">— Seleccione municipio —</option>'
      + lista.map(function(m){ return '<option'+(m===prev?' selected':'')+'>'+m+'</option>'; }).join('')
    : '<option value="">— Seleccione departamento primero —</option>';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeModal(); closeDetail(); closeNav(); }
});


// ═══════════════════════════════════════════════════════════
//  REPORTE GENERAL — genera y descarga HTML con gráficas
// ═══════════════════════════════════════════════════════════
function generarReporte() {
  var fecha = new Date().toLocaleDateString('es-HN',{day:'2-digit',month:'long',year:'numeric'});
  var allP  = Object.values(DB).flat();
  var total = allP.length;
  var ejec  = allP.filter(function(p){return p.estado==='En Ejecución';}).length;
  var proc  = allP.filter(function(p){return p.estado==='En Proceso / Contratación';}).length;
  var susp  = allP.filter(function(p){return p.estado==='Suspendido';}).length;
  var term  = allP.filter(function(p){return p.estado==='Terminado';}).length;
  var avgFis= total ? (allP.reduce(function(a,p){return a+(parseFloat(p.avanceFisico)||0);},0)/total).toFixed(1) : 0;
  var totalMonto   = allP.reduce(function(a,p){var mI=parseFloat(p.montoContratoInicial)||0;var mM=parseFloat(p.montoModificacion)||0;return a+(mM>0?mM:mI);},0);
  var totalDeveng  = allP.reduce(function(a,p){return a+(parseFloat(p.totalDevengado)||0);},0);
  var avgFin = totalMonto>0 ? (totalDeveng/totalMonto*100).toFixed(1) : 0;

  // Per-unit data
  var unitData = Object.entries(UNIDADES).map(function(e){
    var k=e[0]; var u=e[1];
    var pl = DB[k]||[];
    var af  = pl.length ? (pl.reduce(function(a,p){return a+(parseFloat(p.avanceFisico)||0);},0)/pl.length).toFixed(1) : 0;
    var mon = pl.reduce(function(a,p){var mI=parseFloat(p.montoContratoInicial)||0;var mM=parseFloat(p.montoModificacion)||0;return a+(mM>0?mM:mI);},0);
    var dev = pl.reduce(function(a,p){return a+(parseFloat(p.totalDevengado)||0);},0);
    var afin= mon>0?(dev/mon*100).toFixed(1):0;
    var eN  = pl.filter(function(p){return p.estado==='En Ejecución';}).length;
    var sN  = pl.filter(function(p){return p.estado==='Suspendido';}).length;
    var tN  = pl.filter(function(p){return p.estado==='Terminado';}).length;
    return {key:k,nombre:u.nombre,color:u.color,total:pl.length,af:af,afin:afin,
            monto:mon,devengado:dev,ejec:eN,susp:sN,term:tN};
  });

  function fmtL(n){return n.toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});}

  // Build SVG donut pie charts per unit (outer ring=físico, inner ring=financiero)
  function makePie(pct, color, r, cx, cy) {
    var p = Math.min(Math.max(parseFloat(pct)||0,0),100);
    var circ = 2*Math.PI*r;
    var dash = (p/100)*circ;
    var gap  = circ-dash;
    return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#e8ecf0" stroke-width="14"/>'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="14"'
      +' stroke-dasharray="'+dash.toFixed(1)+' '+gap.toFixed(1)+'"'
      +' stroke-linecap="butt" transform="rotate(-90 '+cx+' '+cy+')" />';
  }
  var piecharts = unitData.map(function(u){
    var cx=55,cy=55;
    var label = u.nombre
      .replace('Red Vial No Pavimentada','RV No Pavim.')
      .replace('Red Vial Pavimentada','RV Pavimentada')
      .replace('Respuesta Rápida a Emergencias','Resp. Rápida')
      .replace('Fondos Externos/Nacionales','Fondos Ext/Nac')
      .replace('Fondos BCIE','Fondos BCIE')
      .replace('Limpieza de Derecho de Vía','Limp. D. de Vía');
    return '<div style="text-align:center;width:150px;">'
      +'<svg width="110" height="110" viewBox="0 0 110 110">'
      + makePie(u.af,  '#1268C4', 42, cx, cy)
      + makePie(u.afin,'#0D7A4E', 26, cx, cy)
      +'<text x="'+cx+'" y="'+(cy-5)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#1268C4" font-family="monospace">'+u.af+'%</text>'
      +'<text x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle" font-size="10" fill="#0D7A4E" font-family="monospace">'+u.afin+'%</text>'
      +'</svg>'
      +'<div style="font-size:10px;color:#333;font-weight:600;margin-top:2px;line-height:1.4;">'+label+'</div>'
      +'<div style="font-size:9px;color:#888;margin-top:1px;">'+u.total+' proy.</div>'
      +'</div>';
  }).join('');

  // Estado pie visual (simple bar)
  var estadoRows = [
    {label:'En Ejecución',val:ejec,color:'#0D7A4E'},
    {label:'En Proceso',val:proc,color:'#1268C4'},
    {label:'Suspendido',val:susp,color:'#B8620A'},
    {label:'Terminado',val:term,color:'#7B8FA0'},
  ].map(function(e){
    var pct = total>0?(e.val/total*100).toFixed(1):0;
    return '<tr><td style="padding:5px 8px;font-size:12px;">'+e.label+'</td>'
      +'<td style="padding:5px 8px;"><div style="height:14px;background:#eee;border-radius:3px;overflow:hidden;width:200px;">'
      +'<div style="height:100%;width:'+pct+'%;background:'+e.color+';border-radius:3px;"></div></div></td>'
      +'<td style="padding:5px 12px;font-size:12px;font-weight:600;">'+e.val+'</td>'
      +'<td style="padding:5px 8px;font-size:11px;color:#666;">'+pct+'%</td>'
      +'</tr>';
  }).join('');

  // Unit summary table rows
  var unitRows = unitData.map(function(u){
    return '<tr>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500;color:'+u.color+';">'+u.nombre+'</td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">'+u.total+'</td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">'+u.ejec+'</td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">'+u.susp+'</td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">'+u.term+'</td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">'
        +'<div style="display:flex;align-items:center;gap:6px;">'
        +'<div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden;">'
        +'<div style="height:100%;width:'+u.af+'%;background:#1268C4;border-radius:4px;"></div></div>'
        +'<span style="font-size:11px;font-weight:600;color:#1268C4;width:36px;">'+u.af+'%</span></div></td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">'
        +'<div style="display:flex;align-items:center;gap:6px;">'
        +'<div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden;">'
        +'<div style="height:100%;width:'+u.afin+'%;background:#0D7A4E;border-radius:4px;"></div></div>'
        +'<span style="font-size:11px;font-weight:600;color:#0D7A4E;width:36px;">'+u.afin+'%</span></div></td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:11px;">L '+fmtL(u.monto)+'</td>'
      +'<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:11px;">L '+fmtL(u.devengado)+'</td>'
      +'</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>'
    +'<title>Reporte DGCV — '+fecha+'</title>'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0;}'
    +'body{font-family:"Segoe UI",Arial,sans-serif;background:#f5f7fa;color:#1C2B3A;font-size:13px;}'
    +'.page{max-width:1100px;margin:0 auto;padding:24px;}'
    +'.header{background:linear-gradient(135deg,#001233,#002B6B);color:#fff;padding:28px 32px;border-radius:10px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #D4A820;}'
    +'.header h1{font-size:20px;font-weight:700;letter-spacing:.3px;}'
    +'.header p{font-size:11px;opacity:.7;margin-top:4px;}'
    +'.header .fecha{text-align:right;font-size:11px;opacity:.7;}'
    +'.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:24px;}'
    +'.kpi{background:#fff;border-radius:8px;padding:16px;border:1px solid #D0DCE6;border-top:3px solid #1268C4;}'
    +'.kpi.g{border-top-color:#0D7A4E;}.kpi.a{border-top-color:#D4A820;}.kpi.r{border-top-color:#C0392B;}.kpi.gr{border-top-color:#7B8FA0;}'
    +'.kpi-num{font-size:28px;font-weight:300;color:#001233;font-family:monospace;line-height:1;}'
    +'.kpi-lbl{font-size:11px;color:#7B8FA0;margin-top:5px;font-weight:500;}'
    +'.section{background:#fff;border-radius:8px;border:1px solid #D0DCE6;margin-bottom:20px;overflow:hidden;}'
    +'.section-title{background:#f8f9fb;padding:12px 18px;font-size:12px;font-weight:600;color:#002B6B;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid #D0DCE6;display:flex;align-items:center;gap:8px;}'
    +'.section-title::before{content:"";display:inline-block;width:3px;height:16px;background:#D4A820;border-radius:2px;}'
    +'.section-body{padding:18px;}'
    +'.chart-container{display:flex;gap:8px;align-items:flex-end;padding:10px 0;}'
    +'.legend{display:flex;gap:16px;margin-top:12px;justify-content:center;}'
    +'.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#666;}'
    +'.legend-dot{width:10px;height:10px;border-radius:2px;}'
    +'table{width:100%;border-collapse:collapse;}'
    +'th{background:#f0f4f8;padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:#7B8FA0;letter-spacing:.5px;text-transform:uppercase;border-bottom:2px solid #D0DCE6;}'
    +'.footer{text-align:center;font-size:10px;color:#aaa;margin-top:24px;padding:12px;border-top:1px solid #eee;}'
    +'@media print{'+'*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+'body{background:#fff;font-size:11px;}'+'@page{margin:12mm 10mm;size:A4;}'+'button{display:none;}'+'body{background:#fff!important;}'+'}'
    +'</style></head><body><div class="page">'

    // Header
    +'<div class="header">'
    +'<div><h1>Reporte General de Avance — DGCV</h1><p>Dirección General de Conservación Vial · Secretaría de Infraestructura y Transporte</p></div>'
    +'<div class="fecha">Generado el<br><strong>'+fecha+'</strong></div>'
    +'</div>'

    // KPIs
    +'<div class="kpi-grid">'
    +'<div class="kpi"><div class="kpi-num">'+total+'</div><div class="kpi-lbl">Total Proyectos</div></div>'
    +'<div class="kpi g"><div class="kpi-num">'+ejec+'</div><div class="kpi-lbl">En Ejecución</div></div>'
    +'<div class="kpi a"><div class="kpi-num">'+avgFis+'%</div><div class="kpi-lbl">Avance Físico Prom.</div></div>'
    +'<div class="kpi g"><div class="kpi-num">'+avgFin+'%</div><div class="kpi-lbl">Avance Financiero Prom.</div></div>'
    +'<div class="kpi r"><div class="kpi-num">'+susp+'</div><div class="kpi-lbl">Suspendidos</div></div>'
    +'</div>'

    // Gráfica pastel avance por unidad
    +'<div class="section"><div class="section-title">Avance por Unidad</div><div class="section-body">'
    +'<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;padding:10px 0;">'+piecharts+'</div>'
    +'<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#1268C4"></div>Avance Físico</div>'
    +'<div class="legend-item"><div class="legend-dot" style="background:#0D7A4E"></div>Avance Financiero</div>'
    +'<div class="legend-item"><div class="legend-dot" style="background:#e0e0e0"></div>Pendiente</div></div>'
    +'</div></div>'

    // Estado de proyectos
    +'<div class="section"><div class="section-title">Distribución por Estado</div><div class="section-body">'
    +'<table><thead><tr><th>Estado</th><th>Distribución</th><th>Cantidad</th><th>Porcentaje</th></tr></thead>'
    +'<tbody>'+estadoRows+'</tbody></table>'
    +'</div></div>'

    // Resumen por unidad
    +'<div class="section"><div class="section-title">Resumen por Unidad</div><div class="section-body">'
    +'<table><thead><tr>'
    +'<th>Unidad</th><th>Proyectos</th><th>En Ejec.</th><th>Susp.</th><th>Term.</th>'
    +'<th>Av. Físico</th><th>Av. Financiero</th><th>Monto Contrato</th><th>Total Devengado</th>'
    +'</tr></thead><tbody>'+unitRows+'</tbody></table>'
    +'</div></div>'

    // Monto total
    +'<div class="section"><div class="section-title">Resumen Financiero General</div><div class="section-body">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">'
    +'<div style="text-align:center;padding:16px;background:#f0f4f8;border-radius:8px;">'
    +'<div style="font-size:11px;color:#7B8FA0;margin-bottom:4px;">Monto Total de Contratos</div>'
    +'<div style="font-size:18px;font-weight:600;color:#001233;font-family:monospace;">L '+fmtL(totalMonto)+'</div></div>'
    +'<div style="text-align:center;padding:16px;background:#f0f4f8;border-radius:8px;">'
    +'<div style="font-size:11px;color:#7B8FA0;margin-bottom:4px;">Total Devengado</div>'
    +'<div style="font-size:18px;font-weight:600;color:#0D7A4E;font-family:monospace;">L '+fmtL(totalDeveng)+'</div></div>'
    +'<div style="text-align:center;padding:16px;background:#f0f4f8;border-radius:8px;">'
    +'<div style="font-size:11px;color:#7B8FA0;margin-bottom:4px;">Saldo Pendiente</div>'
    +'<div style="font-size:18px;font-weight:600;color:#C0392B;font-family:monospace;">L '+fmtL(totalMonto-totalDeveng)+'</div></div>'
    +'</div></div></div>'

    +'<div class="footer">Reporte generado por el Sistema de Seguimiento DGCV · '+fecha+' · Secretaría de Infraestructura y Transporte · República de Honduras</div>'
    +'</div></body></html>';

  // Generar PDF directamente usando html2pdf.js
  var nombreArchivo = 'Reporte_DGCV_' + new Date().toISOString().slice(0,10) + '.pdf';
  showToast('Generando PDF, espere un momento...', 'ok');

  function ejecutarHtml2Pdf() {
    var contenedor = document.createElement('div');
    contenedor.innerHTML = html;
    contenedor.style.position = 'absolute';
    contenedor.style.left = '-9999px';
    contenedor.style.top = '0';
    document.body.appendChild(contenedor);

    var opt = {
      margin:       [8, 8, 8, 8],
      filename:     nombreArchivo,
      image:        { type: 'jpeg', quality: 0.97 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(contenedor.querySelector('.page') || contenedor).save()
      .then(function() {
        document.body.removeChild(contenedor);
        showToast('✓ PDF descargado: ' + nombreArchivo, 'ok');
      })
      .catch(function(e) {
        document.body.removeChild(contenedor);
        showToast('Error al generar PDF: ' + e.message, 'err');
      });
  }

  // Cargar html2pdf.js si no está disponible
  if (typeof html2pdf === 'undefined') {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = ejecutarHtml2Pdf;
    script.onerror = function() {
      showToast('No se pudo cargar la librería de PDF. Verifique su conexión.', 'err');
    };
    document.head.appendChild(script);
  } else {
    ejecutarHtml2Pdf();
  }
}


// ═══════════════════════════════════════════════════════════
//  ALERTAS — Navegación al proyecto desde el banner
// ═══════════════════════════════════════════════════════════
function navegarAAlerta(unidadKey, proyIdx) {
  if (!unidadKey) return;
  // Cerrar banner
  var list = document.getElementById('alerta-list');
  if (list) list.style.display = 'none';
  var icon = document.getElementById('alerta-toggle-icon');
  if (icon) icon.textContent = '▼ ver detalle';

  // Navegar a la unidad
  var navEl = document.getElementById('nav-' + unidadKey);
  showView(unidadKey, navEl);

  // Abrir el detalle del proyecto después de un pequeño delay
  // para que el DOM de la tabla ya esté renderizado
  if (proyIdx !== undefined && proyIdx >= 0) {
    setTimeout(function() {
      openDetail(unidadKey, proyIdx);
    }, 150);
  }
}

// ═══════════════════════════════════════════════════════════
//  MÓVIL — NAVEGACIÓN DRAWER
// ═══════════════════════════════════════════════════════════
function isMobile() { return window.innerWidth <= 600; }

function toggleNav() {
  var sidenav = document.querySelector('.sidenav');
  var overlay = document.getElementById('navOverlay');
  if (sidenav.classList.contains('open')) {
    closeNav();
  } else {
    sidenav.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeNav() {
  var sidenav = document.querySelector('.sidenav');
  var overlay = document.getElementById('navOverlay');
  if (sidenav) sidenav.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function checkMobileLayout() {
  var btn = document.getElementById('hamburgerBtn');
  if (!btn) return;
  if (isMobile()) {
    btn.style.display = 'flex';
  } else {
    btn.style.display = 'none';
    closeNav();
  }
}

window.addEventListener('resize', checkMobileLayout);
window.addEventListener('load', checkMobileLayout);

// Swipe gestures: left-edge swipe opens nav, swipe-left closes it
(function() {
  var startX = 0, startY = 0;
  document.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function(e) {
    if (!isMobile()) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = Math.abs(e.changedTouches[0].clientY - startY);
    if (startX < 30 && dx > 60 && dy < 60) toggleNav();
    if (dx < -80 && dy < 60) closeNav();
  }, { passive: true });
})();
