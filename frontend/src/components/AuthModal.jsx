import React, { useState } from 'react';
import { Shield, Mail, Key, User, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ onLoginSuccess, showToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'recovery'
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: request, 2: reset

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDatoSensible, setRegDatoSensible] = useState('');

  const [recEmail, setRecEmail] = useState('');
  const [recToken, setRecToken] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');

  const [loading, setLoading] = useState(false);

  // Password checklist state
  const hasLength = regPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(regPassword);
  const hasLower = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(regPassword);

  // Mask preview
  const maskPreview = regDatoSensible.trim()
    ? `***-***-${regDatoSensible.trim().length >= 4 ? regDatoSensible.trim().slice(-4) : regDatoSensible.trim().padStart(4, '*')}`
    : '***-***-****';

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.login(loginEmail, loginPassword);
      if (data && data.usuario) {
        showToast(`Bienvenido a SecureVault, ${data.usuario.nombre}`, 'success');
        onLoginSuccess(data.usuario, data.token);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      showToast('La contraseña debe cumplir con todos los requisitos de complejidad.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await api.registro({
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        datoSensible: regDatoSensible
      });
      showToast('Cuenta creada exitosamente con rol "usuario". Ahora inicie sesión.', 'success');
      setTab('login');
      setLoginEmail(regEmail);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSolicitarToken(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.solicitarRecuperacion(recEmail);
      showToast(data.mensaje, 'info');
      setRecoveryStep(2);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestablecerPassword(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.restablecerPassword(recToken, recNewPassword);
      showToast(data.mensaje, 'success');
      setTab('login');
      setRecoveryStep(1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-shield-icon">
            <Shield size={24} />
          </div>
          <h1 className="auth-title">Acceso a Bóveda Segura</h1>
          <p className="auth-subtitle">Infraestructura criptográfica corporativa con autenticación reforzada</p>
        </div>

        {/* Pestañas */}
        <div className="tabs-nav">
          <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Iniciar Sesión
          </button>
          <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            Crear Cuenta
          </button>
          <button className={`tab-btn ${tab === 'recovery' ? 'active' : ''}`} onClick={() => setTab('recovery')}>
            Recuperar Acceso
          </button>
        </div>

        {/* Tab 1: Iniciar Sesión */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="form-grid">
            <div className="form-group">
              <label>Correo Electrónico Corporativo</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  required
                  placeholder="analista@empresa.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Contraseña Maestra</label>
              <div className="input-with-icon">
                <Key size={16} />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>
            <p className="auth-footnote">Protegido con limitación de tasa (máx. 5 intentos / 15 min - OWASP A07).</p>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Verificando con Argon2id...' : 'Ingresar a la Bóveda'}
            </button>
          </form>
        )}

        {/* Tab 2: Crear Cuenta */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="form-grid">
            <div className="form-group">
              <label>Nombre Completo</label>
              <div className="input-with-icon">
                <User size={16} />
                <input
                  type="text"
                  required
                  placeholder="Carlos Mendoza"
                  maxLength={100}
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  required
                  placeholder="carlos@empresa.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Contraseña de Alta Seguridad</label>
              <div className="input-with-icon">
                <Key size={16} />
                <input
                  type="password"
                  required
                  placeholder="Ej: Secr3t!2026Enterprise"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>
              <div className="password-checklist">
                <span className={`check-item ${hasLength ? 'valid' : ''}`}>• Mín. 10 caracteres</span>
                <span className={`check-item ${hasUpper ? 'valid' : ''}`}>• 1 Mayúscula</span>
                <span className={`check-item ${hasLower ? 'valid' : ''}`}>• 1 Minúscula</span>
                <span className={`check-item ${hasNumber ? 'valid' : ''}`}>• 1 Número</span>
                <span className={`check-item ${hasSymbol ? 'valid' : ''}`}>• 1 Símbolo</span>
              </div>
            </div>
            <div className="form-group">
              <label>Dato Sensible (Cifrado AES-256-GCM en Reposo)</label>
              <input
                type="text"
                required
                placeholder="Ej: Identificación, teléfono o token confidencial"
                value={regDatoSensible}
                onChange={(e) => setRegDatoSensible(e.target.value)}
              />
              <div className="mask-preview-hint">
                Vista enmascarada para terceros: <strong>{maskPreview}</strong>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Cifrando y Hasheando...' : 'Crear Cuenta Segura'}
            </button>
          </form>
        )}

        {/* Tab 3: Recuperar Acceso */}
        {tab === 'recovery' && (
          <div>
            <div className="recovery-subnav">
              <button
                type="button"
                className={`subtab-btn ${recoveryStep === 1 ? 'active' : ''}`}
                onClick={() => setRecoveryStep(1)}
              >
                1. Solicitar Token
              </button>
              <button
                type="button"
                className={`subtab-btn ${recoveryStep === 2 ? 'active' : ''}`}
                onClick={() => setRecoveryStep(2)}
              >
                2. Restablecer
              </button>
            </div>

            {recoveryStep === 1 ? (
              <form onSubmit={handleSolicitarToken} className="form-grid">
                <p className="help-text">
                  Ingrese su correo corporativo para generar un token criptográfico de un solo uso (TTL: 15 min).
                </p>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@empresa.com"
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-block" disabled={loading}>
                  {loading ? 'Generando...' : 'Solicitar Token Seguro'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRestablecerPassword} className="form-grid">
                <p className="help-text">
                  Ingrese el token hexadecimal de 64 caracteres recibido y su nueva contraseña.
                </p>
                <div className="form-group">
                  <label>Token de Recuperación</label>
                  <input
                    type="text"
                    required
                    placeholder="64 caracteres hexadecimales..."
                    value={recToken}
                    onChange={(e) => setRecToken(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 10 caracteres con mayúscula, número y símbolo"
                    value={recNewPassword}
                    onChange={(e) => setRecNewPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Restablecer Contraseña'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
