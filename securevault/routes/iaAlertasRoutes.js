'use strict';

const express = require('express');
const { autenticar, requireRole } = require('../middlewares/authMiddleware');
const iaAlertasController = require('../controladores/iaAlertasController');

const router = express.Router();

router.use(autenticar);

// Agentes IA (1..8)
router.get('/agentes', iaAlertasController.listarEjecucionesIa);
router.post('/ejecutar-agente', iaAlertasController.registrarEjecucionIa);

// Alertas de Anomalías (Fuga, Margen, Runway)
router.get('/alertas', iaAlertasController.listarAlertas);
router.patch('/alertas/:id/resolver', requireRole('administrador'), iaAlertasController.resolverAlerta);

module.exports = router;
