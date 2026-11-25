import React from 'react';
import { RefreshCw, UserCheck, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function AdminUsersView({ users, onReload, showToast }) {
  async function handleCambiarRol(u) {
    const nuevoRol = u.rol === 'administrador' ? 'usuario' : 'administrador';
    if (window.confirm(`¿Confirma cambiar el rol de "${u.nombre}" a "${nuevoRol}"?`)) {
      try {
        await api.cambiarRol(u.id, nuevoRol);
        showToast(`Rol de ${u.nombre} actualizado a ${nuevoRol}. Evento CAMBIO_ROL auditado en SIEM.`, 'success');
        onReload();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Directorio Corporativo de Usuarios (Admin)</h2>
          <p className="panel-subtitle">Control de asignación de roles y visualización sanitizada con enmascaramiento de datos</p>
        </div>
        <div className="panel-actions">
          <button className="btn btn-outline" onClick={onReload}>
            <RefreshCw size={14} />
            Refrescar
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Correo Electrónico</th>
              <th>Rol Asignado</th>
              <th>Dato Sensible (Enmascarado)</th>
              <th>Fecha de Alta</th>
              <th style={{ textAlign: 'right' }}>Acciones de Privilegio</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map(u => (
                <tr key={u.id}>
                  <td><strong>#{u.id}</strong></td>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.rol === 'administrador' ? 'badge-warning' : 'badge-info'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <span className="masked-code">{u.datoSensible || '***-***-****'}</span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleCambiarRol(u)}
                    >
                      {u.rol === 'administrador' ? 'Degradar a Usuario' : 'Ascender a Administrador'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No hay usuarios cargados o no tiene permisos de administrador.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
