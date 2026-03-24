'use strict';

// CONFIGURACIÓN SUPABASE
var SUPA_URL = 'https://furbzmtimdvsterqenff.supabase.co/rest/v1';
var SUPA_KEY = 'sb_publishable_v7rjxV61uvkibEfTDo6gJA_78Rzsocm';
var APP_SECRET = 'SIT_DGCV_2025_SECRET';
var H_BASE = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
var H_WRITE = Object.assign({}, H_BASE, { 'Prefer': 'return=minimal', 'x-app-secret': APP_SECRET });

// ESTADO GLOBAL
var DB = { rvp:[], rvnp:[], rre:[], fext:[], fbcie:[], ldv:[] };
var EMPRESAS = { constructoras:[], supervisoras:[] };
var currentUser = null;
var currentView = 'dashboard';
var editingId = null;
var currentRegType = 'construccion'; // 'construccion' | 'supervision'

// CONSTANTES
var ESTADOS = ['En Ejecución','En Proceso / Contratación','Suspendido','Terminado'];
var DEPTOS = ['Atlántida','Choluteca','Colón','Comayagua','Copán','Cortés','El Paraíso','Francisco Morazán','Gracias a Dios','Intibucá','Islas de la Bahía','La Paz','Lempira','Ocotepeque','Olancho','Santa Bárbara','Valle','Yoro'];
var UNIDADES = {
  rvp: { nombre:'Red Vial Pavimentada', color:'#1268C4', bg:'#D6EBF9' },
  rvnp: { nombre:'Red Vial No Pavimentada', color:'#0D7A4E', bg:'#E3F5EE' },
  rre: { nombre:'Respuesta Rápida a Emergencias', color:'#C0392B', bg:'#FBEAEA' },
  fext: { nombre:'Fondos Externos/Nacionales', color:'#0A6E5C', bg:'#E0F5F0' },
  fbcie: { nombre:'Fondos BCIE', color:'#7A3500', bg:'#FFF0E0' },
  ldv: { nombre:'Limpieza de Derecho de Vía', color:'#B8620A', bg:'#FDF3E3' }
};

// --- LÓGICA DE APERTURA DE FORMULARIO (PASO 1 Y 2) ---

function openForm(u, idx) {
    var proj = (idx !== null && idx !== undefined) ? (DB[u] || [])[idx] : null;
    editingId = { u: u, idx: idx };

    // Si es nuevo, mostramos el selector
    if (idx === null) {
        showTypeSelector(u);
    } else {
        // Si editamos, cargamos el tipo que ya tiene el proyecto
        currentRegType = proj.tipo_registro || 'construccion';
        renderFormByType(u, proj);
    }
    document.getElementById('modalOverlay').classList.add('open');
}

function showTypeSelector(u) {
    document.getElementById('modalTitle').textContent = 'Seleccione tipo de registro';
    document.getElementById('modalFooter').style.display = 'none'; // Ocultar botones de guardado
    document.getElementById('modalBody').innerHTML = `
        <div class="selector-grid">
            <div class="selector-card" onclick="startNewRegister('construccion')">
                <div style="font-size:32px">🏗️</div>
                <h4>Registrar Construcción</h4>
                <p>Contratos de obra y mantenimiento vial.</p>
            </div>
            <div class="selector-card" onclick="startNewRegister('supervision')">
                <div style="font-size:32px">📋</div>
                <h4>Registrar Supervisión</h4>
                <p>Contratos de supervisión externa de proyectos.</p>
            </div>
        </div>
    `;
}

function startNewRegister(type) {
    currentRegType = type;
    document.getElementById('modalFooter').style.display = 'flex';
    renderFormByType(editingId.u, null);
}

function renderFormByType(u, p) {
    if (currentRegType === 'supervision') {
        renderSupervisionForm(u, p);
    } else {
        renderConstruccionForm(u, p);
    }
}

// FORMULARIO: CONSTRUCCIÓN
function renderConstruccionForm(u, p) {
    p = p || {};
    var fv = (f) => (p[f] || '').toString().replace(/"/g, '&quot;');
    document.getElementById('modalTitle').textContent = 'Registro de Construcción — ' + UNIDADES[u].nombre;
    
    // Obtener supervisiones registradas en esta unidad para el select
    var sups = (DB[u] || []).filter(item => item.tipo_registro === 'supervision');
    var supOptions = sups.map(s => `<option value="${s.noContrato}" ${p.noContratoSup === s.noContrato ? 'selected' : ''}>${s.supervisora} (Contrato: ${s.noContrato})</option>`).join('');

    document.getElementById('modalBody').innerHTML = `
        <div class="form-section">
            <div class="form-section-title">Datos Generales de la Obra</div>
            <div class="form-grid g2">
                <div class="form-group span2"><label>Nombre del Proyecto <span class="req">*</span></label><input type="text" id="f_proyecto" value="${fv('proyecto')}"/></div>
                <div class="form-group"><label>N° Proceso <span class="req">*</span></label><input type="text" id="f_nProceso" value="${fv('nProceso')}"/></div>
                <div class="form-group"><label>Estado <span class="req">*</span></label><select id="f_estado">${ESTADOS.map(e=>`<option ${p.estado===e?'selected':''}>${e}</option>`).join('')}</select></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Empresa Constructora</div>
            <div class="form-grid g2">
                <div class="form-group"><label>Constructora <span class="req">*</span></label>${empresaInput('f_constructora','constructora',fv('constructora'))}</div>
                <div class="form-group"><label>N° Contrato Obra <span class="req">*</span></label><input type="text" id="f_noContrato" value="${fv('noContrato')}"/></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Supervisión</div>
            <div class="form-grid g2" style="margin-bottom:10px">
                <div class="form-group"><label>Tipo de Supervisión</label>
                    <select id="f_tipoSupervision" onchange="toggleSupervisionFields(this.value)">
                        <option value="interna" ${p.tipoSupervision === 'interna' ? 'selected' : ''}>Supervisión Interna (DGCV)</option>
                        <option value="externa" ${p.tipoSupervision === 'externa' ? 'selected' : ''}>Supervisión Externa</option>
                    </select>
                </div>
            </div>
            <div id="fields_sup_interna" style="display:${p.tipoSupervision === 'externa' ? 'none' : 'block'}">
                <div class="form-group"><label>Nombre del Supervisor de Campo <span class="req">*</span></label><input type="text" id="f_supervisor" value="${fv('supervisor')}"/></div>
            </div>
            <div id="fields_sup_externa" style="display:${p.tipoSupervision === 'externa' ? 'block' : 'none'}">
                <div class="form-group"><label>Seleccione Contrato de Supervisión Pre-registrado <span class="req">*</span></label>
                    <select id="f_noContratoSup">
                        <option value="">— Seleccione contrato —</option>
                        ${supOptions}
                    </select>
                </div>
            </div>
        </div>
        ${renderCommonFields(p)}
    `;
    initFormLogic(p);
}

// FORMULARIO: SUPERVISIÓN
function renderSupervisionForm(u, p) {
    p = p || {};
    var fv = (f) => (p[f] || '').toString().replace(/"/g, '&quot;');
    document.getElementById('modalTitle').textContent = 'Registro de Supervisión — ' + UNIDADES[u].nombre;

    document.getElementById('modalBody').innerHTML = `
        <div class="form-section">
            <div class="form-section-title">Datos del Contrato de Supervisión</div>
            <div class="form-grid g2">
                <div class="form-group span2"><label>Nombre del Proyecto de Supervisión <span class="req">*</span></label><input type="text" id="f_proyecto" value="${fv('proyecto')}"/></div>
                <div class="form-group"><label>Empresa Supervisora <span class="req">*</span></label>${empresaInput('f_supervisora','supervisora',fv('supervisora'))}</div>
                <div class="form-group"><label>N° Contrato Supervisión <span class="req">*</span></label><input type="text" id="f_noContrato" value="${fv('noContrato')}"/></div>
                <div class="form-group span2"><label>Contratos a los que supervisa <span class="req">*</span></label><input type="text" id="f_contratosSupervisa" value="${fv('contratosSupervisa')}" placeholder="Ej: Contrato 001-2025, 045-2025..."/></div>
            </div>
        </div>
        ${renderCommonFields(p)}
    `;
    initFormLogic(p);
}

// CAMPOS COMUNES (Ubicación, Fechas, Financiero)
function renderCommonFields(p) {
    var fv = (f) => (p[f] || '').toString().replace(/"/g, '&quot;');
    return `
        <div class="form-section">
            <div class="form-section-title">Ubicación</div>
            <div class="form-grid g3">
                <div class="form-group"><label>Departamento</label><select id="f_departamento">${DEPTOS.map(d=>`<option ${p.departamento===d?'selected':''}>${d}</option>`).join('')}</select></div>
                <div class="form-group"><label>Municipio</label><input type="text" id="f_municipio" value="${fv('municipio')}"/></div>
                <div class="form-group"><label>Aldea/Barrio</label><input type="text" id="f_aldeaBarrio" value="${fv('aldeaBarrio')}"/></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Información Financiera y Avance</div>
            <div class="form-grid g2">
                <div class="form-group"><label>Monto Contrato (L)</label><input type="number" id="f_montoContratoInicial" value="${fv('montoContratoInicial')}" oninput="recalcPagos()"/></div>
                <div class="form-group"><label>Avance Físico (%)</label><input type="number" id="f_avanceFisico" value="${fv('avanceFisico')}" min="0" max="100"/></div>
            </div>
            <div id="pagos-container" style="margin-top:15px"></div>
            <button class="add-row-btn" onclick="addPago()">+ Agregar Pago</button>
        </div>
    `;
}

// --- AUXILIARES ---

function toggleSupervisionFields(val) {
    document.getElementById('fields_sup_interna').style.display = (val === 'interna') ? 'block' : 'none';
    document.getElementById('fields_sup_externa').style.display = (val === 'externa') ? 'block' : 'none';
}

function initFormLogic(p) {
    p = p || {};
    (p.pagos || []).forEach(pg => addPago(pg));
    if (!(p.pagos || []).length) addPago();
}

function empresaInput(id, tipo, valor) {
    var lista = tipo === 'supervisora' ? EMPRESAS.supervisoras : EMPRESAS.constructoras;
    var opts = lista.map(e => `<option value="${e.nombre.replace(/"/g,'&quot;')}">`).join('');
    return `<input type="text" id="${id}" value="${valor}" list="dl-${id}" placeholder="Escriba..." autocomplete="off"/><datalist id="dl-${id}">${opts}</datalist>`;
}

function addPago(data) {
    data = data || {};
    var n = document.querySelectorAll('.pago-card').length + 1;
    var div = document.createElement('div');
    div.className = 'pago-card';
    div.style = "background:var(--gris6); padding:10px; border-radius:6px; margin-bottom:10px; border:1px solid var(--border)";
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px">
            <span style="font-size:10px; font-weight:bold">PAGO N° ${n}</span>
            <button onclick="this.parentElement.parentElement.remove(); recalcPagos()" style="background:none; border:none; color:var(--rojo); cursor:pointer">✕</button>
        </div>
        <div class="form-grid g2">
            <div class="form-group"><label>Monto (L)</label><input type="number" class="pago-monto" value="${data.monto || ''}" oninput="recalcPagos()"/></div>
            <div class="form-group"><label>Fecha</label><input type="date" class="pago-fecha" value="${data.fechaIngreso || ''}"/></div>
        </div>
    `;
    document.getElementById('pagos-container').appendChild(div);
}

function recalcPagos() {
    // Aquí puedes añadir la lógica de suma si quieres mostrar un totalizador en el modal
}

// --- GUARDAR ---

async function saveProject() {
    var u = editingId.u;
    var idx = editingId.idx;
    var g = (id) => { var el = document.getElementById(id); return el ? el.value : ''; };

    // Recolectar pagos
    var pagos = [];
    document.querySelectorAll('.pago-card').forEach(card => {
        var m = card.querySelector('.pago-monto').value;
        if(m) pagos.push({ monto: m, fechaIngreso: card.querySelector('.pago-fecha').value });
    });

    var proj = {
        tipo_registro: currentRegType,
        proyecto: g('f_proyecto'),
        nProceso: g('f_nProceso'),
        estado: g('f_estado'),
        departamento: g('f_departamento'),
        municipio: g('f_municipio'),
        aldeaBarrio: g('f_aldeaBarrio'),
        montoContratoInicial: g('f_montoContratoInicial'),
        avanceFisico: g('f_avanceFisico'),
        pagos: pagos,
        _unidad: u
    };

    if (currentRegType === 'construccion') {
        proj.constructora = g('f_constructora');
        proj.noContrato = g('f_noContrato');
        proj.tipoSupervision = g('f_tipoSupervision');
        if (proj.tipoSupervision === 'interna') {
            proj.supervisor = g('f_supervisor');
        } else {
            proj.noContratoSup = g('f_noContratoSup');
            // Buscamos el nombre de la empresa supervisora vinculada para guardarlo
            var supObj = (DB[u]||[]).find(s => s.noContrato === proj.noContratoSup);
            proj.supervisora = supObj ? supObj.supervisora : 'Externa';
        }
    } else {
        proj.supervisora = g('f_supervisora');
        proj.noContrato = g('f_noContrato');
        proj.contratosSupervisa = g('f_contratosSupervisa');
    }

    // Guardar Local
    if (idx === null) DB[u].push(proj);
    else DB[u][idx] = Object.assign(DB[u][idx], proj);

    showToast("Guardando registro...", "ok");
    
    // Persistir en Supabase
    try {
        await persistirProyecto(u, proj);
        showBanner("✓ Registro guardado correctamente");
        closeModal();
        renderUnidad(u);
    } catch(e) {
        showToast("Error al guardar en base de datos", "err");
    }
}

// --- FUNCIONES DE NAVEGACIÓN Y AUTH ---

async function doLogin() {
    var u = document.getElementById('loginUnidad').value;
    var user = document.getElementById('loginUser').value;
    if(!u || !user) return alert("Complete los datos");
    
    currentUser = { nombre: user, unidad: u, esAdmin: (u==='admin') };
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('userName').textContent = user;
    
    showToast("Cargando base de datos...", "ok");
    await cargarProyectos();
    await cargarEmpresas();
    showView('dashboard', document.getElementById('nav-dashboard'));
}

function doLogout() { location.reload(); }

function showView(view, el) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
    if(view === 'dashboard') renderDashboard();
    else if(view === 'formatos') renderFormatosPanel();
    else renderUnidad(view);
}

function renderUnidad(u) {
    var plist = DB[u] || [];
    var rows = plist.map((p, i) => `
        <tr>
            <td>${i+1}</td>
            <td>
                <div style="font-weight:600">${p.proyecto}</div>
                <div style="font-size:10px; color:var(--gris3)">${p.tipo_registro === 'supervision' ? '📋 SUPERVISIÓN' : '🏗️ CONSTRUCCIÓN'}</div>
            </td>
            <td>${p.tipo_registro === 'supervision' ? p.supervisora : p.constructora}</td>
            <td>${p.noContrato || '—'}</td>
            <td><span class="pill ${p.estado === 'En Ejecución' ? 'ejec' : 'proc'}">${p.estado}</span></td>
            <td>
                <button class="tbl-btn" onclick="openDetail('${u}',${i})">Ver</button>
                <button class="tbl-btn edit" onclick="openForm('${u}',${i})">Editar</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('mainContent').innerHTML = `
        <div class="page-header">
            <h2>${UNIDADES[u].nombre}</h2>
            <div class="page-actions"><button class="btn btn-primary" onclick="openForm('${u}',null)">+ Nuevo Registro</button></div>
        </div>
        <div class="table-wrap">
            <table class="tbl">
                <thead><tr><th>#</th><th>Proyecto</th><th>Empresa</th><th>Contrato</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" style="text-align:center">No hay registros</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

// --- FUNCIONES DE COMUNICACIÓN CON SUPABASE ---

async function cargarProyectos() {
    try {
        let r = await fetch(SUPA_URL + '/proyectos?select=*', { headers: H_BASE });
        let rows = await r.json();
        DB = { rvp:[], rvnp:[], rre:[], fext:[], fbcie:[], ldv:[] };
        rows.forEach(row => {
            if(DB[row.unidad]) {
                let p = row.data; p._sid = row.id;
                DB[row.unidad].push(p);
            }
        });
        document.getElementById('syncDot').style.background = "var(--verde)";
        document.getElementById('syncLabel').textContent = "Conectado";
    } catch(e) { 
        document.getElementById('syncLabel').textContent = "Modo Offline";
    }
}

async function cargarEmpresas() {
    try {
        let r = await fetch(SUPA_URL + '/empresas?select=*', { headers: H_BASE });
        let rows = await r.json();
        EMPRESAS.constructoras = rows.filter(e => e.tipo === 'constructora' || e.tipo === 'ambas');
        EMPRESAS.supervisoras = rows.filter(e => e.tipo === 'supervisora' || e.tipo === 'ambas');
    } catch(e) {}
}

async function persistirProyecto(unidad, data) {
    let row = { unidad: unidad, proyecto: data.proyecto, data: data };
    let url = SUPA_URL + '/proyectos';
    let method = 'POST';
    
    if(data._sid) {
        url += '?id=eq.' + data._sid;
        method = 'PATCH';
    }

    let r = await fetch(url, {
        method: method,
        headers: H_WRITE,
        body: JSON.stringify(row)
    });
    if(!r.ok) throw new Error("Error DB");
}

function showToast(m, type) {
    var t = document.getElementById('toast');
    t.textContent = m; t.className = 'toast show';
    setTimeout(() => t.className = 'toast', 3000);
}

function showBanner(m) {
    var b = document.getElementById('successBanner');
    b.textContent = m; b.className = 'success-banner show';
    setTimeout(() => b.className = 'success-banner', 3000);
}

function closeModal(e) { if(!e || e.target.id === 'modalOverlay') document.getElementById('modalOverlay').classList.remove('open'); }

function renderDashboard() { document.getElementById('mainContent').innerHTML = "<h3>Dashboard en construcción</h3>"; }
function renderFormatosPanel() { document.getElementById('mainContent').innerHTML = "<h3>Panel de formatos</h3>"; }
function openDetail(u, i) { alert("Detalle: " + DB[u][i].proyecto); }
