/**
 * SecureVault Enterprise - Client Application Engine
 * OWASP Top 10:2025 compliant frontend
 */

'use strict';

// ============================================================================
// Estado Global de la Aplicación
// ============================================================================
const state = {
  currentUser: null,
  csrfToken: sessionStorage.getItem('securevault_csrf') || null,
  notes: [],
  users: [],
  events: [],
  editingNoteId: null
};

// ============================================================================
// Utilidades de Red y API Wrapper
// ============================================================================

async function apiRequest(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  if (state.csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
    defaultHeaders['X-CSRF-Token'] = state.csrfToken;
  }

  const config = {
    ...options,
    credentials: 'include', // Para transmisión segura de cookies HttpOnly
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(endpoint, config);

    // Manejo de errores de autenticación y autorización
    if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/registro')) {
      showToast('Sesión expirada o no autorizada. Inicie sesión nuevamente.', 'warning');
      logout();
      return null;
    }

    if (res.status === 403) {
      showToast('Acceso denegado (403): Permisos insuficientes.', 'error');
      return null;
    }

    if (res.status === 429) {
      showToast('Límite de intentos excedido (429). Por favor espere 15 minutos.', 'error');
      return null;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let mensajeError = data.error || data.mensaje || 'Error en la solicitud.';
      if (data.detalles && Array.isArray(data.detalles)) {
        mensajeError += ': ' + data.detalles.map(d => `${d.campo}: ${d.mensaje}`).join(', ');
      }
      throw new Error(mensajeError);
    }

    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// ============================================================================
// Notificaciones Toast
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span style="font-weight: 700; font-size: 1.1rem; line-height: 1;">${iconMap[type] || '•'}</span>
    <span style="flex: 1;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Verificación de Salud del Sistema (RF-08)
// ============================================================================

async function checkSystemHealth() {
  const badge = document.getElementById('systemHealthBadge');
  const label = badge?.querySelector('.status-label');

  try {
    const res = await fetch('/health', { cache: 'no-store' });
    if (res.ok) {
      badge?.classList.add('online');
      badge?.classList.remove('offline');
      if (label) label.textContent = 'API: En Línea';
    } else {
      throw new Error();
    }
  } catch {
    badge?.classList.add('offline');
    badge?.classList.remove('online');
    if (label) label.textContent = 'API: Desconectada';
  }
}

// ============================================================================
// Gestión de Vistas y Autenticación
// ============================================================================

function initAuthUI() {
  // Pestañas de Autenticación
  document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-card .tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Subtabs de Recuperación
  const btnSubSolicitar = document.getElementById('btnSubtabSolicitar');
  const btnSubRestablecer = document.getElementById('btnSubtabRestablecer');
  const formSolicitar = document.getElementById('formSolicitarToken');
  const formRestablecer = document.getElementById('formRestablecerPassword');

  btnSubSolicitar?.addEventListener('click', () => {
    btnSubSolicitar.classList.add('active');
    btnSubRestablecer.classList.remove('active');
    formSolicitar.classList.remove('hidden');
    formRestablecer.classList.add('hidden');
  });

  btnSubRestablecer?.addEventListener('click', () => {
    btnSubRestablecer.classList.add('active');
    btnSubSolicitar.classList.remove('active');
    formRestablecer.classList.remove('hidden');
    formSolicitar.classList.add('hidden');
  });

  // Password Checklist en tiempo real
  const pwdInput = document.getElementById('regPassword');
  pwdInput?.addEventListener('input', () => {
    const val = pwdInput.value;
    updateCheck('chkLength', val.length >= 10);
    updateCheck('chkUpper', /[A-Z]/.test(val));
    updateCheck('chkLower', /[a-z]/.test(val));
    updateCheck('chkNumber', /[0-9]/.test(val));
    updateCheck('chkSymbol', /[^A-Za-z0-9]/.test(val));
  });

  function updateCheck(id, valid) {
    const el = document.getElementById(id);
    if (!el) return;
    if (valid) {
      el.classList.add('valid');
    } else {
      el.classList.remove('valid');
    }
  }

  // Previsualización de Dato Sensible Enmascarado (***-***-XXXX)
  const sensibleInput = document.getElementById('regDatoSensible');
  const maskPreview = document.getElementById('maskPreview');
  sensibleInput?.addEventListener('input', () => {
    const val = sensibleInput.value.trim();
    if (!val) {
      maskPreview.textContent = '***-***-****';
    } else {
      const lastFour = val.length >= 4 ? val.slice(-4) : val.padStart(4, '*');
      maskPreview.textContent = `***-***-${lastFour}`;
    }
  });

  // Formulario: Iniciar Sesión
  document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await apiRequest('/api/usuarios/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data && data.usuario) {
        state.currentUser = data.usuario;
        if (data.csrfToken) {
          state.csrfToken = data.csrfToken;
          sessionStorage.setItem('securevault_csrf', data.csrfToken);
        }
        showToast(`Bienvenido, ${data.usuario.nombre}`, 'success');
        renderApp();
      }
    } catch {
      // Error manejado en apiRequest
    }
  });

  // Formulario: Registro
  document.getElementById('formRegister')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('regNombre').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const datoSensible = document.getElementById('regDatoSensible').value.trim();

    try {
      const data = await apiRequest('/api/usuarios/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password, datoSensible })
      });

      if (data) {
        showToast('Cuenta creada exitosamente con rol "usuario". Ahora inicie sesión.', 'success');
        document.getElementById('formRegister').reset();
        document.querySelector('.auth-tabs .tab-btn[data-tab="tabLogin"]').click();
      }
    } catch {
      // Error manejado en apiRequest
    }
  });

  // Formulario: Solicitar Recuperación
  document.getElementById('formSolicitarToken')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recoveryEmail').value.trim();

    try {
      const data = await apiRequest('/api/usuarios/solicitar-recuperacion', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (data) {
        showToast(data.mensaje, 'info');
        btnSubRestablecer.click();
      }
    } catch {}
  });

  // Formulario: Restablecer Contraseña
  document.getElementById('formRestablecerPassword')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('resetToken').value.trim();
    const password = document.getElementById('resetPassword').value;

    try {
      const data = await apiRequest('/api/usuarios/restablecer-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });

      if (data) {
        showToast('Contraseña restablecida. Inicie sesión.', 'success');
        document.getElementById('formRestablecerPassword').reset();
        document.querySelector('.auth-tabs .tab-btn[data-tab="tabLogin"]').click();
      }
    } catch {}
  });

  // Botón Logout
  document.getElementById('btnLogout')?.addEventListener('click', logout);
}

async function logout() {
  await fetch('/api/usuarios/logout', {
    method: 'POST',
    credentials: 'include',
    headers: state.csrfToken ? { 'X-CSRF-Token': state.csrfToken } : {}
  }).catch(() => {});

  state.currentUser = null;
  state.csrfToken = null;
  state.notes = [];
  state.users = [];
  state.events = [];
  sessionStorage.removeItem('securevault_csrf');
  showToast('Sesión finalizada de manera segura.', 'info');
  renderApp();
}

function renderApp() {
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const userProfileArea = document.getElementById('userProfileArea');
  const userDisplayName = document.getElementById('userDisplayName');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const userAvatar = document.getElementById('userAvatarLetter');

  if (state.currentUser) {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userProfileArea.classList.remove('hidden');

    userDisplayName.textContent = state.currentUser.nombre || state.currentUser.email;
    userRoleBadge.textContent = state.currentUser.rol;
    userAvatar.textContent = (state.currentUser.nombre || 'U')[0].toUpperCase();

    if (state.currentUser.rol === 'administrador') {
      userRoleBadge.classList.add('admin');
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
      userRoleBadge.classList.remove('admin');
      document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }

    // Cargar notas al entrar
    loadNotas();
  } else {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    userProfileArea.classList.add('hidden');
  }
}

// ============================================================================
// Navegación de Vistas del Dashboard
// ============================================================================

function initDashboardNav() {
  document.querySelectorAll('.dashboard-tabs .nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dashboard-tabs .nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.dashboard-view-panel').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const viewId = tab.dataset.view;
      const viewPanel = document.getElementById(viewId);
      if (viewPanel) {
        viewPanel.classList.add('active');
      }

      if (viewId === 'viewNotas') loadNotas();
      if (viewId === 'viewUsuarios') loadUsuarios();
      if (viewId === 'viewBitacora') loadBitacora();
    });
  });
}

// ============================================================================
// Bóveda de Notas (CRUD Confidencial)
// ============================================================================

async function loadNotas() {
  try {
    const notas = await apiRequest('/api/notas');
    if (notas && Array.isArray(notas)) {
      state.notes = notas;
      renderNotas(notas);
    }
  } catch {
    // Manejado en apiRequest
  }
}

function renderNotas(notasList) {
  const grid = document.getElementById('notasGrid');
  const emptyState = document.getElementById('emptyNotasState');
  const metricTotal = document.getElementById('metricTotalNotas');

  if (metricTotal) metricTotal.textContent = String(notasList.length);

  if (!grid) return;
  grid.innerHTML = '';

  if (notasList.length === 0) {
    grid.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    return;
  }

  grid.classList.remove('hidden');
  emptyState?.classList.add('hidden');

  notasList.forEach(nota => {
    const card = document.createElement('div');
    card.className = 'nota-card';

    const fecha = new Date(nota.updatedAt || nota.createdAt).toLocaleString();

    card.innerHTML = `
      <div>
        <div class="nota-header">
          <h3 class="nota-title">${escapeHtml(nota.titulo)}</h3>
          <span class="nota-date">${fecha}</span>
        </div>
        <div class="nota-body">${escapeHtml(nota.contenido)}</div>
      </div>
      <div class="nota-footer">
        <div class="encryption-tag">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          AES-256-GCM
        </div>
        <div class="nota-actions">
          <button class="btn-icon copy-btn" title="Copiar texto descifrado" data-id="${nota.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-icon edit-btn" title="Editar nota" data-id="${nota.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon delete delete-btn" title="Eliminar nota" data-id="${nota.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Eventos de botones
    card.querySelector('.copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(nota.contenido);
      showToast('Contenido descifrado copiado al portapapeles.', 'info');
    });

    card.querySelector('.edit-btn').addEventListener('click', () => {
      openEditNotaModal(nota);
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm(`¿Confirma eliminar la nota "${nota.titulo}" de manera definitiva?`)) {
        await deleteNota(nota.id);
      }
    });

    grid.appendChild(card);
  });
}

function initNotasUI() {
  const modal = document.getElementById('modalNota');
  const btnOpen = document.getElementById('btnOpenModalNota');
  const btnClose = document.getElementById('btnCloseModalNota');
  const btnCancel = document.getElementById('btnCancelModalNota');
  const form = document.getElementById('formNota');

  const inputTitulo = document.getElementById('notaTitulo');
  const inputContenido = document.getElementById('notaContenido');
  const titleCounter = document.getElementById('titleCounter');
  const contentCounter = document.getElementById('contentCounter');

  inputTitulo?.addEventListener('input', () => {
    titleCounter.textContent = `${inputTitulo.value.length} / 120`;
  });

  inputContenido?.addEventListener('input', () => {
    contentCounter.textContent = `${inputContenido.value.length} / 5000`;
  });

  btnOpen?.addEventListener('click', () => {
    state.editingNoteId = null;
    document.getElementById('modalNotaTitle').textContent = 'Nueva Nota Confidencial';
    form.reset();
    titleCounter.textContent = '0 / 120';
    contentCounter.textContent = '0 / 5000';
    modal.classList.remove('hidden');
  });

  const closeModal = () => modal.classList.add('hidden');
  btnClose?.addEventListener('click', closeModal);
  btnCancel?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = inputTitulo.value.trim();
    const contenido = inputContenido.value;

    try {
      if (state.editingNoteId) {
        await apiRequest(`/api/notas/${state.editingNoteId}`, {
          method: 'PUT',
          body: JSON.stringify({ titulo, contenido })
        });
        showToast('Nota actualizada y recifrada exitosamente.', 'success');
      } else {
        await apiRequest('/api/notas', {
          method: 'POST',
          body: JSON.stringify({ titulo, contenido })
        });
        showToast('Nota confidencial cifrada con AES-256-GCM y guardada.', 'success');
      }

      closeModal();
      loadNotas();
    } catch {}
  });

  // Filtro de búsqueda en tiempo real
  document.getElementById('searchNotasInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = state.notes.filter(n =>
      n.titulo.toLowerCase().includes(q) || n.contenido.toLowerCase().includes(q)
    );
    renderNotas(filtered);
  });
}

function openEditNotaModal(nota) {
  state.editingNoteId = nota.id;
  document.getElementById('modalNotaTitle').textContent = 'Editar Nota Confidencial';
  document.getElementById('notaTitulo').value = nota.titulo;
  document.getElementById('notaContenido').value = nota.contenido;
  document.getElementById('titleCounter').textContent = `${nota.titulo.length} / 120`;
  document.getElementById('contentCounter').textContent = `${nota.contenido.length} / 5000`;
  document.getElementById('modalNota').classList.remove('hidden');
}

async function deleteNota(id) {
  try {
    await apiRequest(`/api/notas/${id}`, { method: 'DELETE' });
    showToast('Nota eliminada de la base de datos.', 'info');
    loadNotas();
  } catch {}
}

// ============================================================================
// Panel de Administración: Gestión de Usuarios (RF-07)
// ============================================================================

async function loadUsuarios() {
  if (state.currentUser?.rol !== 'administrador') return;

  try {
    const usuarios = await apiRequest('/api/admin/usuarios');
    if (usuarios && Array.isArray(usuarios)) {
      state.users = usuarios;
      renderUsuarios(usuarios);
    }
  } catch {}
}

function renderUsuarios(usuariosList) {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  usuariosList.forEach(u => {
    const tr = document.createElement('tr');
    const esAdmin = u.rol === 'administrador';
    const nuevoRolSugerido = esAdmin ? 'usuario' : 'administrador';

    tr.innerHTML = `
      <td><strong>#${u.id}</strong></td>
      <td>${escapeHtml(u.nombre)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <span class="badge ${esAdmin ? 'badge-warning' : 'badge-info'}">${u.rol}</span>
      </td>
      <td>
        <span class="masked-code">${escapeHtml(u.datoSensible || '***-***-****')}</span>
      </td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td style="text-align: right;">
        <button class="btn btn-outline btn-sm change-role-btn" data-id="${u.id}" data-newrole="${nuevoRolSugerido}">
          ${esAdmin ? 'Degradar a Usuario' : 'Ascender a Administrador'}
        </button>
      </td>
    `;

    tr.querySelector('.change-role-btn').addEventListener('click', async () => {
      if (confirm(`¿Confirma cambiar el rol del usuario "${u.nombre}" a "${nuevoRolSugerido}"?`)) {
        await cambiarRol(u.id, nuevoRolSugerido);
      }
    });

    tbody.appendChild(tr);
  });
}

async function cambiarRol(id, nuevoRol) {
  try {
    await apiRequest(`/api/admin/usuarios/${id}/rol`, {
      method: 'PATCH',
      body: JSON.stringify({ rol: nuevoRol })
    });
    showToast(`Rol actualizado a ${nuevoRol}. Evento CAMBIO_ROL registrado en SIEM.`, 'success');
    loadUsuarios();
  } catch {}
}

// ============================================================================
// Bitácora de Seguridad (SIEM Viewer)
// ============================================================================

async function loadBitacora() {
  if (state.currentUser?.rol !== 'administrador') return;

  try {
    const eventos = await apiRequest('/api/admin/bitacora');
    if (eventos && Array.isArray(eventos)) {
      state.events = eventos;
      renderBitacora();
    }
  } catch {}
}

function renderBitacora() {
  const tbody = document.getElementById('bitacoraTableBody');
  const filter = document.getElementById('filterTipoEvento')?.value || 'TODOS';
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = filter === 'TODOS'
    ? state.events
    : state.events.filter(e => e.tipoEvento === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No hay eventos registrados con este criterio.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(ev => {
    const tr = document.createElement('tr');

    let badgeClass = 'badge-info';
    if (ev.tipoEvento === 'LOGIN_EXITOSO') badgeClass = 'badge-success';
    if (ev.tipoEvento === 'LOGIN_FALLIDO' || ev.tipoEvento === 'ACCESO_DENEGADO') badgeClass = 'badge-danger';
    if (ev.tipoEvento === 'CAMBIO_ROL' || ev.tipoEvento === 'RESET_PASSWORD') badgeClass = 'badge-warning';

    tr.innerHTML = `
      <td style="font-family: var(--font-mono); font-size: 0.78rem;">
        ${new Date(ev.createdAt).toLocaleString()}
      </td>
      <td>
        <span class="badge ${badgeClass}">${ev.tipoEvento}</span>
      </td>
      <td>
        ${ev.usuarioId ? `Usuario #${ev.usuarioId}` : '<span style="color:var(--text-muted)">Anónimo / Sistema</span>'}
      </td>
      <td style="font-family: var(--font-mono); font-size: 0.8rem;">
        ${escapeHtml(ev.ip || '127.0.0.1')}
      </td>
      <td>
        ${escapeHtml(ev.detalle)}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ============================================================================
// Inicialización Principal al Cargar el DOM
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Restaurar la sesión desde el servidor (cookie HttpOnly)
  try {
    const respuesta = await fetch('/api/usuarios/me', { credentials: 'include' });
    if (respuesta.ok) {
      const sesion = await respuesta.json();
      state.currentUser = sesion.usuario;
      if (sesion.csrfToken) {
        state.csrfToken = sesion.csrfToken;
        sessionStorage.setItem('securevault_csrf', sesion.csrfToken);
      }
    }
  } catch {}

  // 2. Iniciar componentes de UI
  initAuthUI();
  initDashboardNav();
  initNotasUI();

  // 3. Listeners de refresh en panel admin
  document.getElementById('btnRefreshUsuarios')?.addEventListener('click', loadUsuarios);
  document.getElementById('btnRefreshBitacora')?.addEventListener('click', loadBitacora);
  document.getElementById('filterTipoEvento')?.addEventListener('change', renderBitacora);

  // 4. Renderizar vista correspondiente
  renderApp();

  // 5. Monitoreo de salud inicial y periódico
  checkSystemHealth();
  setInterval(checkSystemHealth, 30000);
});
