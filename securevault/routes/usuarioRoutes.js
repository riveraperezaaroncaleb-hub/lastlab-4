'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/authMiddleware');
const {
  limitadorAutenticacion,
  limitadorRecuperacion
} = require('../middlewares/seguridadMiddleware');
const {
  registrarUsuario,
  loginUsuario,
  obtenerSesion,
  logoutUsuario,
  solicitarRecuperacion,
  restablecerPassword
} = require('../controladores/usuarioController');

const router = express.Router();

router.post('/registro', limitadorAutenticacion, registrarUsuario);
router.post('/login', limitadorAutenticacion, loginUsuario);
router.post('/logout', logoutUsuario);
router.get('/me', autenticar, obtenerSesion);

router.post('/solicitar-recuperacion', limitadorRecuperacion, solicitarRecuperacion);
router.post('/restablecer-password', limitadorRecuperacion, restablecerPassword);

module.exports = router;
