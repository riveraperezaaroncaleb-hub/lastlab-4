'use strict';

const express = require('express');
const { autenticar, requireRole } = require('../middlewares/authMiddleware');
const empresaController = require('../controladores/empresaController');

const router = express.Router();

router.use(autenticar);

router.get('/', empresaController.listarEmpresas);
router.post('/', requireRole('administrador'), empresaController.crearEmpresa);
router.get('/:id', empresaController.obtenerEmpresaPorId);
router.put('/:id', requireRole('administrador'), empresaController.actualizarEmpresa);

// BCCR e Indicadores
router.get('/:id/indicadores', empresaController.listarIndicadoresBccr);
router.post('/:id/indicadores/override', requireRole('administrador'), empresaController.registrarOverrideTipoCambio);

// Políticas CABYS
router.get('/:id/politicas-cabys', empresaController.listarPoliticasCabys);
router.post('/:id/politicas-cabys', requireRole('administrador'), empresaController.guardarPoliticaCabys);

module.exports = router;
