'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/authMiddleware');
const {
  crearNota,
  listarNotas,
  obtenerNotaPorId,
  actualizarNota,
  eliminarNota
} = require('../controladores/notaController');

const router = express.Router();

// Todas las rutas de notas están estrictamente protegidas con autenticación
router.use(autenticar);

router.post('/', crearNota);
router.get('/', listarNotas);
router.get('/:id', obtenerNotaPorId);
router.put('/:id', actualizarNota);
router.delete('/:id', eliminarNota);

module.exports = router;
