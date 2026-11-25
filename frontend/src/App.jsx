import React, { useState, useEffect, useCallback } from 'react';
import { Lock, FileText, Users, Activity } from 'lucide-react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import VaultView from './components/VaultView';
import AdminUsersView from './components/AdminUsersView';
import SiemLogsView from './components/SiemLogsView';
import Toast from './components/Toast';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('securevault_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState('notas'); // 'notas' | 'usuarios' | 'bitacora'
  const [isOnline, setIsOnline] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Data collections
  const [notes, setNotes] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [siemEvents, setSiemEvents] = useState([]);

  // Toast dispatcher
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Check health periodically
  useEffect(() => {
    const ping = async () => {
      try {
        const ok = await api.checkHealth();
        setIsOnline(ok);
      } catch {
        setIsOnline(false);
      }
    };
    ping();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for session expiry event
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      showToast('Sesión expirada. Por favor inicie sesión nuevamente.', 'warning');
    };
    window.addEventListener('securevault-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('securevault-auth-expired', handleAuthExpired);
  }, [showToast]);

  // Load active view data
  const loadActiveData = useCallback(async () => {
    if (!user) return;

    if (activeView === 'notas') {
      try {
        const data = await api.getNotas();
        if (Array.isArray(data)) setNotes(data);
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else if (activeView === 'usuarios' && user.rol === 'administrador') {
      try {
        const data = await api.getUsuariosAdmin();
        if (Array.isArray(data)) setAdminUsers(data);
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else if (activeView === 'bitacora' && user.rol === 'administrador') {
      try {
        const data = await api.getBitacora();
        if (Array.isArray(data)) setSiemEvents(data);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }, [user, activeView, showToast]);

  useEffect(() => {
    if (user) {
      loadActiveData();
    }
  }, [user, activeView, loadActiveData]);

  function handleLoginSuccess(userData, token) {
    setUser(userData);
    if (token) {
      localStorage.setItem('securevault_token', token);
    }
    localStorage.setItem('securevault_user', JSON.stringify(userData));
    setActiveView('notas');
  }

  function handleLogout() {
    setUser(null);
    setNotes([]);
    setAdminUsers([]);
    setSiemEvents([]);
    localStorage.removeItem('securevault_token');
    localStorage.removeItem('securevault_user');
    showToast('Sesión cerrada correctamente.', 'info');
  }

  return (
    <div className="app-container">
      <Navbar user={user} isOnline={isOnline} onLogout={handleLogout} />

      <main className="main-content">
        {!user ? (
          <AuthModal onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        ) : (
          <div>
            {/* Dashboard Subnav */}
            <nav className="dashboard-nav">
              <div className="dashboard-tabs">
                <button
                  className={`nav-tab ${activeView === 'notas' ? 'active' : ''}`}
                  onClick={() => setActiveView('notas')}
                >
                  <FileText size={18} />
                  Bóveda de Notas Confidenciales
                </button>

                {user.rol === 'administrador' && (
                  <>
                    <button
                      className={`nav-tab ${activeView === 'usuarios' ? 'active' : ''}`}
                      onClick={() => setActiveView('usuarios')}
                    >
                      <Users size={18} />
                      Gestión de Usuarios
                    </button>
                    <button
                      className={`nav-tab ${activeView === 'bitacora' ? 'active' : ''}`}
                      onClick={() => setActiveView('bitacora')}
                    >
                      <Activity size={18} />
                      Bitácora de Seguridad (SIEM)
                    </button>
                  </>
                )}
              </div>
            </nav>

            {/* View Panels */}
            {activeView === 'notas' && (
              <VaultView notes={notes} onReload={loadActiveData} showToast={showToast} />
            )}

            {activeView === 'usuarios' && user.rol === 'administrador' && (
              <AdminUsersView users={adminUsers} onReload={loadActiveData} showToast={showToast} />
            )}

            {activeView === 'bitacora' && user.rol === 'administrador' && (
              <SiemLogsView events={siemEvents} onReload={loadActiveData} />
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <span>SecureVault Enterprise • Mitigaciones OWASP Top 10:2025</span>
          <span>Arquitectura React + Node.js (AES-256-GCM / Argon2id)</span>
        </div>
      </footer>

      <Toast toasts={toasts} />
    </div>
  );
}
