import React from 'react';
import { Shield, Lock, LogOut } from 'lucide-react';

export default function Navbar({ user, isOnline, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-group">
          <div className="brand-icon">
            <Shield size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-title">SecureVault</span>
            <span className="brand-badge">ENTERPRISE v2.5 • REACT</span>
          </div>
        </div>

        <div className="header-status-group">
          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-label">{isOnline ? 'API: En Línea' : 'API: Desconectada'}</span>
          </div>

          <div className="security-chip">
            <Lock size={13} />
            <span>AES-256-GCM / Argon2id</span>
          </div>

          {user && (
            <div className="user-badge">
              <div className="user-avatar">
                {(user.nombre || 'U')[0].toUpperCase()}
              </div>
              <div className="user-meta">
                <span className="user-name">{user.nombre || user.email}</span>
                <span className={`user-role-chip ${user.rol === 'administrador' ? 'admin' : ''}`}>
                  {user.rol}
                </span>
              </div>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={onLogout}
                title="Cerrar sesión segura"
                style={{ marginLeft: '0.5rem' }}
              >
                <LogOut size={13} />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
