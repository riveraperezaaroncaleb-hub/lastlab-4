'use strict';

const express = require('express');
const { autenticar, requireRole } = require('../middlewares/authMiddleware');
const {
  listarUsuariosAdmin,
  actualizarRolUsuario,
  obtenerBitacora
} = require('../controladores/adminController');

const router = express.Router();

// Protección estricta: Requiere autenticación válida y rol 'administrador' (OWASP A01)
router.use(autenticar);
router.use(requireRole('administrador'));

router.get('/usuarios', listarUsuariosAdmin);
router.patch('/usuarios/:id/rol', actualizarRolUsuario);
router.get('/bitacora', obtenerBitacora);

module.exports = router;
