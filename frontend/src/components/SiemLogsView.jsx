import React, { useState } from 'react';
import { RefreshCw, Activity } from 'lucide-react';

export default function SiemLogsView({ events, onReload }) {
  const [filter, setFilter] = useState('TODOS');

  const filtered = filter === 'TODOS'
    ? events
    : events.filter(e => e.tipoEvento === filter);

  function getBadgeClass(tipo) {
    if (tipo === 'LOGIN_EXITOSO') return 'badge-success';
    if (tipo === 'LOGIN_FALLIDO' || tipo === 'ACCESO_DENEGADO') return 'badge-danger';
    if (tipo === 'CAMBIO_ROL' || tipo === 'RESET_PASSWORD') return 'badge-warning';
    return 'badge-info';
  }

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Bitácora de Eventos de Seguridad (SIEM)</h2>
          <p className="panel-subtitle">Auditoría inmutable de accesos, intentos de login, cambios de rol y eventos de autenticación (OWASP A09)</p>
        </div>
        <div className="panel-actions">
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
          >
            <option value="TODOS">Todos los tipos de eventos</option>
            <option value="LOGIN_EXITOSO">LOGIN_EXITOSO</option>
            <option value="LOGIN_FALLIDO">LOGIN_FALLIDO</option>
            <option value="ACCESO_DENEGADO">ACCESO_DENEGADO</option>
            <option value="CAMBIO_ROL">CAMBIO_ROL</option>
            <option value="RESET_PASSWORD">RESET_PASSWORD</option>
          </select>
          <button className="btn btn-outline" onClick={onReload}>
            <RefreshCw size={14} />
            Actualizar Bitácora
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Timestamp (Local)</th>
              <th>Tipo de Evento</th>
              <th>Usuario Afectado</th>
              <th>Dirección IP</th>
              <th>Detalle de Auditoría Sanitizado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(ev.tipoEvento)}`}>
                      {ev.tipoEvento}
                    </span>
                  </td>
                  <td>
                    {ev.usuarioId ? `Usuario #${ev.usuarioId}` : <span style={{ color: 'var(--text-muted)' }}>Anónimo / Sistema</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {ev.ip || '127.0.0.1'}
                  </td>
                  <td>
                    {ev.detalle}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No se registran eventos con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
