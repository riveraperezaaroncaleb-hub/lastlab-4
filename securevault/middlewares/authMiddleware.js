'use strict';

const { Usuario, EventoSeguridad } = require('../models');
const config = require('../config/security');
const logger = require('../utils/logger');
const { verifySessionToken } = require('../utils/crypto');

function extraerToken(req) {
  const cookieToken = req.cookies?.[config.sesion.cookieName];
  if (cookieToken) {
    req.authMethod = 'cookie';
    return cookieToken;
  }

  const authorization = req.headers?.authorization;
  if (typeof authorization === 'string') {
    const partes = authorization.split(' ');
    if (partes.length === 2 && /^Bearer$/i.test(partes[0])) {
      req.authMethod = 'bearer';
      return partes[1];
    }
  }

  return null;
}

async function registrarDenegacion(req, usuarioId, detalle) {
  logger.warn({
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
    userId: usuarioId,
    motivo: detalle
  }, 'Acceso denegado');

  await EventoSeguridad.registrar({
    tipoEvento: 'ACCESO_DENEGADO',
    usuarioId,
    ip: req.ip,
    detalle: detalle.slice(0, 255)
  });
}

async function autenticar(req, res, next) {
  const token = extraerToken(req);

  if (!token) {
    await registrarDenegacion(req, null, 'Token de sesión no proporcionado');
    return res.status(401).json({
      error: 'No autenticado. Por favor inicie sesión para acceder a este recurso.'
    });
  }

  const sesion = verifySessionToken(token);
  if (!sesion) {
    await registrarDenegacion(req, null, 'Token de sesión inválido o expirado');
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }

  try {
    const usuario = await Usuario.findByPk(sesion.id, {
      attributes: ['id', 'nombre', 'email', 'rol', 'sesionVersion', 'id_empresa']
    });

    if (!usuario || usuario.email.toLowerCase() !== sesion.email) {
      await registrarDenegacion(req, sesion.id, 'Sesión asociada a un usuario inexistente');
      return res.status(401).json({ error: 'Sesión no válida.' });
    }

    if ((usuario.sesionVersion ?? 0) !== sesion.version) {
      await registrarDenegacion(req, usuario.id, 'Sesión revocada por cambio de credenciales');
      return res.status(401).json({ error: 'Sesión revocada. Inicie sesión nuevamente.' });
    }

    req.user = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      id_empresa: usuario.id_empresa || 1
    };
    req.sesion = sesion;

    return next();
  } catch (error) {
    logger.error({ err: error.message }, 'Error al validar la sesión');
    return res.status(500).json({ error: 'No se pudo validar la sesión.' });
  }
}

function requireRole(...rolesPermitidos) {
  return async (req, res, next) => {
    if (!req.user) {
      await registrarDenegacion(req, null, 'Rol solicitado sin autenticación');
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      await registrarDenegacion(
        req,
        req.user.id,
        `Rol "${req.user.rol}" sin permisos para ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({
        error: 'Acceso denegado. No tiene permisos suficientes para realizar esta acción.'
      });
    }

    return next();
  };
}

function requireSameUserOrRole(...rolesPermitidos) {
  return async (req, res, next) => {
    const idSolicitado = Number(req.params.id);
    if (!req.user) {
      await registrarDenegacion(req, null, 'Acceso a recurso propio sin autenticación');
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (idSolicitado !== req.user.id && !rolesPermitidos.includes(req.user.rol)) {
      await registrarDenegacion(req, req.user.id, 'Intento de acceso a recurso de otro usuario');
      return res.status(403).json({ error: 'Acceso denegado a este recurso.' });
    }

    return next();
  };
}

module.exports = {
  autenticar,
  requireRole,
  requireSameUserOrRole
};
