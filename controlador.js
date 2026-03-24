// 1. CONFIGURACIÓN (Reemplaza con tus datos de Supabase)
const URL_PROYECTO = "https://furbzmtimdvsterqenff.supabase.co";
const CLAVE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cmJ6bXRpbWR2c3RlcnFlbmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDI4OTcsImV4cCI6MjA4OTUxODg5N30.EFbDE4dU514Ua9SNQ5y-LgyVp7QRJe1Gf5H98sYu5Eg";
const CABECERAS = {
    "apikey": CLAVE_ANON,
    "Authorization": `Bearer ${CLAVE_ANON}`,
    "Content-Type": "application/json",
    "x-app-secret": "SIT_DGCV_2025_SECRET" // La firma que definiste en SQL
};

// 2. NAVEGACIÓN
function cambiarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    document.getElementById(`sec-${id}`).style.display = 'block';
    if (id === 'proyectos') cargarProyectos();
    if (id === 'empresas') cargarEmpresas();
}

// 3. CARGAR DATOS (SELECT)
async function cargarProyectos() {
    const res = await fetch(`${URL_PROYECTO}/rest/v1/proyectos?select=*`, { headers: CABECERAS });
    const datos = await res.json();
    const tabla = document.getElementById('tabla-proyectos-body');
    tabla.innerHTML = datos.map(p => `
        <tr>
            <td>${p.codigo || 'N/A'}</td>
            <td>${p.nombre}</td>
            <td>${p.avance_fisico || 0}%</td>
            <td>${p.estado}</td>
        </tr>
    `).join('');
    document.getElementById('total-proyectos').innerText = datos.length;
}

async function cargarEmpresas() {
    const res = await fetch(`${URL_PROYECTO}/rest/v1/empresas?select=*`, { headers: CABECERAS });
    const datos = await res.json();
    const tabla = document.getElementById('tabla-empresas-body');
    tabla.innerHTML = datos.map(e => `
        <tr>
            <td>${e.nombre}</td>
            <td>${e.rtn || '---'}</td>
            <td>${e.tipo}</td>
        </tr>
    `).join('');
    document.getElementById('total-empresas').innerText = datos.length;
}

// 4. GUARDAR DATOS (INSERT)
document.getElementById('form-proyecto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevo = {
        nombre: document.getElementById('p-nombre').value,
        codigo: document.getElementById('p-codigo').value,
        avance_fisico: document.getElementById('p-avance').value,
        estado: document.getElementById('p-estado').value
    };

    const res = await fetch(`${URL_PROYECTO}/rest/v1/proyectos`, {
        method: "POST",
        headers: CABECERAS,
        body: JSON.stringify(nuevo)
    });

    if (res.ok) {
        alert("¡Proyecto guardado con éxito!");
        cerrarModal('modal-proyecto');
        cargarProyectos();
    } else {
        alert("Error: Verifica que el x-app-secret sea correcto.");
    }
});

// 5. FUNCIONES DE MODAL
function abrirModal(id) { document.getElementById(id).style.display = 'block'; }
function cerrarModal(id) { document.getElementById(id).style.display = 'none'; }

// Iniciar cargando el dashboard
cambiarSeccion('dashboard');
cargarProyectos(); // Para actualizar los contadores iniciales
cargarEmpresas();
