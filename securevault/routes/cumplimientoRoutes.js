'use strict';

const express = require('express');
const { autenticar, requireRole } = require('../middlewares/authMiddleware');
const cumplimientoController = require('../controladores/cumplimientoController');

const router = express.Router();

router.use(autenticar);

// Consentimientos Legales (Ley 8968)
router.get('/consentimientos', cumplimientoController.listarConsentimientos);
router.post('/consentimientos', cumplimientoController.registrarConsentimiento);

// Derecho de Supresión (Eliminación de datos personales)
router.get('/solicitudes-eliminacion', requireRole('administrador'), cumplimientoController.listarSolicitudesEliminacion);
router.post('/solicitudes-eliminacion', cumplimientoController.solicitarEliminacion);
router.patch('/solicitudes-eliminacion/:id/procesar', requireRole('administrador'), cumplimientoController.procesarSolicitudEliminacion);

// Bitácora Auditoría Accesos
router.get('/auditoria-accesos', requireRole('administrador'), cumplimientoController.listarAuditoriaAccesos);

module.exports = router;
