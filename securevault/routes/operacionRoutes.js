'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/authMiddleware');
const operacionController = require('../controladores/operacionController');

const router = express.Router();

router.use(autenticar);

// Terceros (Clientes y Proveedores Hacienda)
router.get('/terceros', operacionController.listarTerceros);
router.post('/terceros', operacionController.crearTercero);

// Ventas POS Bimoneda
router.get('/ventas', operacionController.listarVentas);
router.post('/ventas', operacionController.registrarVentaPos);

// Compras Proveedores y CPP
router.get('/compras', operacionController.listarCompras);
router.post('/compras', operacionController.registrarCompraProveedor);

module.exports = router;
