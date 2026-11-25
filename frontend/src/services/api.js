/**
 * SecureVault Enterprise API Client
 */

const API_BASE = 'http://localhost:3000';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('securevault_token');
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const config = {
    ...options,
    credentials: 'include', // Para enviar cookies HttpOnly
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, config);

  if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/registro')) {
    localStorage.removeItem('securevault_token');
    localStorage.removeItem('securevault_user');
    window.dispatchEvent(new Event('securevault-auth-expired'));
    throw new Error('Sesión no autorizada o expirada.');
  }

  if (res.status === 403) {
    throw new Error('Acceso denegado (403): Permisos insuficientes.');
  }

  if (res.status === 429) {
    throw new Error('Límite de intentos excedido (429). Por favor espere 15 minutos.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let msg = data.error || data.mensaje || 'Error en la solicitud.';
    if (data.detalles && Array.isArray(data.detalles)) {
      msg += ': ' + data.detalles.map(d => `${d.campo}: ${d.mensaje}`).join(', ');
    }
    throw new Error(msg);
  }

  return data;
}

export const api = {
  // Diagnóstico
  checkHealth: () => fetch(`${API_BASE}/health`, { cache: 'no-store' }).then(r => r.ok),

  // Autenticación
  login: (email, password) => request('/api/usuarios/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  registro: (userData) => request('/api/usuarios/registro', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  solicitarRecuperacion: (email) => request('/api/usuarios/solicitar-recuperacion', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  restablecerPassword: (token, password) => request('/api/usuarios/restablecer-password', {
    method: 'POST',
    body: JSON.stringify({ token, password })
  }),

  // Notas (Bóveda)
  getNotas: () => request('/api/notas'),
  createNota: (nota) => request('/api/notas', {
    method: 'POST',
    body: JSON.stringify(nota)
  }),
  updateNota: (id, nota) => request(`/api/notas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(nota)
  }),
  deleteNota: (id) => request(`/api/notas/${id}`, {
    method: 'DELETE'
  }),

  // Administración
  getUsuariosAdmin: () => request('/api/admin/usuarios'),
  cambiarRol: (id, rol) => request(`/api/admin/usuarios/${id}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ rol })
  }),
  getBitacora: () => request('/api/admin/bitacora')
};
