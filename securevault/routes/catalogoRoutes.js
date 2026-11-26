'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/authMiddleware');
const catalogoController = require('../controladores/catalogoController');

const router = express.Router();

router.use(autenticar);

// Categorías Operativas
router.get('/categorias', catalogoController.listarCategorias);
router.post('/categorias', catalogoController.crearCategoria);

// Catálogo e Inventario CPP
router.get('/items', catalogoController.listarItems);
router.post('/items', catalogoController.crearItem);

// Movimientos y Ajustes Auditados
router.get('/movimientos', catalogoController.listarMovimientos);
router.post('/movimientos/ajuste', catalogoController.registrarAjusteInventario);

// Gastos Operativos y Detección de Fugas
router.get('/gastos', catalogoController.listarGastos);
router.post('/gastos', catalogoController.registrarGasto);

module.exports = router;
