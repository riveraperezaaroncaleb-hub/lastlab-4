import React, { useState } from 'react';
import { Plus, Search, Copy, Edit2, Trash2, Shield, Lock } from 'lucide-react';
import { api } from '../services/api';

export default function VaultView({ notes, onReload, showToast }) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = notes.filter(n =>
    n.titulo.toLowerCase().includes(search.toLowerCase()) ||
    n.contenido.toLowerCase().includes(search.toLowerCase())
  );

  function openCreateModal() {
    setEditingId(null);
    setTitulo('');
    setContenido('');
    setModalOpen(true);
  }

  function openEditModal(nota) {
    setEditingId(nota.id);
    setTitulo(nota.titulo);
    setContenido(nota.contenido);
    setModalOpen(true);
  }

  async function handleSaveNota(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateNota(editingId, { titulo, contenido });
        showToast('Nota confidencial actualizada y recifrada.', 'success');
      } else {
        await api.createNota({ titulo, contenido });
        showToast('Nota cifrada con AES-256-GCM y almacenada con éxito.', 'success');
      }
      setModalOpen(false);
      onReload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNota(nota) {
    if (window.confirm(`¿Confirma eliminar la nota "${nota.titulo}" permanentemente?`)) {
      try {
        await api.deleteNota(nota.id);
        showToast('Nota eliminada de la base de datos.', 'info');
        onReload();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    showToast('Contenido descifrado copiado al portapapeles.', 'info');
  }

  return (
    <div>
      {/* Encabezado del Panel */}
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Bóveda Criptográfica Personal</h2>
          <p className="panel-subtitle">Documentos cifrados con clave simétrica AES-256-GCM individual (OWASP A01 / A04)</p>
        </div>
        <div className="panel-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar en notas descifradas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Nueva Nota Cifrada
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Notas Almacenadas</span>
          <span className="metric-value">{notes.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Algoritmo en Reposo</span>
          <span className="metric-value text-accent">AES-256-GCM</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Integridad de Autenticación</span>
          <span className="metric-value text-success">Auth Tag 16 Bytes</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Control de Acceso</span>
          <span className="metric-value text-warning">Anti-IDOR Activo</span>
        </div>
      </div>

      {/* Grid de Notas */}
      {filtered.length > 0 ? (
        <div className="notas-grid">
          {filtered.map(nota => (
            <div key={nota.id} className="nota-card">
              <div>
                <div className="nota-header">
                  <h3 className="nota-title">{nota.titulo}</h3>
                  <span className="nota-date">
                    {new Date(nota.updatedAt || nota.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="nota-body">{nota.contenido}</div>
              </div>

              <div className="nota-footer">
                <div className="encryption-tag">
                  <Lock size={12} />
                  AES-256-GCM
                </div>
                <div className="nota-actions">
                  <button className="btn-icon" onClick={() => handleCopy(nota.contenido)} title="Copiar texto descifrado">
                    <Copy size={14} />
                  </button>
                  <button className="btn-icon" onClick={() => openEditModal(nota)} title="Editar nota">
                    <Edit2 size={14} />
                  </button>
                  <button className="btn-icon delete" onClick={() => handleDeleteNota(nota)} title="Eliminar nota">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Shield size={48} />
          </div>
          <h3>Su bóveda está vacía</h3>
          <p>No se encontraron notas confidenciales. Puede crear documentos protegidos con cifrado de grado militar.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Crear Primera Nota
          </button>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Nota Confidencial' : 'Nueva Nota Confidencial'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveNota}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div className="label-with-counter">
                  <label>Título de la Nota</label>
                  <span className="char-counter">{titulo.length} / 120</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ej: Llave de firma o secreto de infraestructura"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div className="label-with-counter">
                  <label>Contenido Confidencial</label>
                  <span className="char-counter">{contenido.length} / 5000</span>
                </div>
                <textarea
                  rows={8}
                  required
                  maxLength={5000}
                  placeholder="Escriba la información sensible aquí. Se cifrará con AES-256-GCM antes de transmitirse y persistirse en la base de datos..."
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                />
              </div>

              <div className="encryption-warning-badge">
                <Shield size={16} />
                <span>Payload protegido con tag de autenticación de 16 bytes e IV aleatorio único de 12 bytes.</span>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Cifrando...' : 'Guardar y Cifrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
