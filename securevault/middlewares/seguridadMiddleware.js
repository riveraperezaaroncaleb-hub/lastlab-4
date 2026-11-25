'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/security');
const logger = require('../utils/logger');
const { safeEqual } = require('../utils/crypto');

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RUTAS_SIN_CSRF = new Set([
  '/api/usuarios/login',
  '/api/usuarios/registro',
  '/api/usuarios/solicitar-recuperacion',
  '/api/usuarios/restablecer-password'
]);

function corsSeguro(req, res, next) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  if (origin && config.origenesPermitidos.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${config.sesion.csrfHeaderName}`);
    res.setHeader('Access-Control-Max-Age', '600');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  } else if (req.method === 'OPTIONS') {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }

  return next();
}

function verificarOrigen(req, res, next) {
  if (METODOS_SEGUROS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  if (!config.origenesPermitidos.has(origin)) {
    logger.warn({ ip: req.ip, origin, method: req.method, path: req.path }, 'Origen rechazado');
    return res.status(403).json({ error: 'Origen de la solicitud no permitido.' });
  }

  return next();
}

function proteccionCsrf(req, res, next) {
  if (METODOS_SEGUROS.has(req.method)) return next();
  if (RUTAS_SIN_CSRF.has(req.path)) return next();
  if (req.authMethod === 'bearer') return next();

  const cookieToken = req.cookies?.[config.sesion.csrfCookieName];
  const headerToken = req.headers?.[config.sesion.csrfHeaderName];

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    logger.warn({ ip: req.ip, method: req.method, path: req.path }, 'Token CSRF inválido o ausente');
    return res.status(403).json({ error: 'Solicitud rechazada: token CSRF inválido.' });
  }

  return next();
}

function requestLogger(req, res, next) {
  const inicio = process.hrtime.bigint();
  const requestId = req.headers['x-request-id']?.toString().slice(0, 64);

  res.on('finish', () => {
    const duracionMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(duracionMs),
      ip: req.ip
    }, 'Solicitud procesada');
  });

  next();
}

function crearLimitador(opciones, mensaje) {
  return rateLimit({
    ...opciones,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: mensaje }
  });
}

const limitadorGlobal = crearLimitador(
  config.limites.global,
  'Demasiadas solicitudes. Intente nuevamente en unos minutos.'
);

const limitadorAutenticacion = crearLimitador(
  config.limites.autenticacion,
  'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.'
);

const limitadorRecuperacion = crearLimitador(
  config.limites.recuperacion,
  'Demasiadas solicitudes de recuperación. Intente nuevamente más tarde.'
);

function manejador404(_req, res) {
  return res.status(404).json({ error: 'Recurso no encontrado.' });
}

function manejadorErrores(err, req, res, _next) {
  logger.error({
    err: {
      message: err?.message,
      name: err?.name,
      stack: config.isProduction ? undefined : err?.stack
    },
    method: req.method,
    path: req.path
  }, 'Error no controlado');

  const estadosPermitidos = new Set([400, 401, 403, 404, 409, 413, 415, 429]);
  let status = estadosPermitidos.has(err?.status || err?.statusCode)
    ? err.status || err.statusCode
    : 500;

  if (err?.type === 'entity.parse.failed') status = 400;
  if (err?.type === 'entity.too.large') status = 413;

  const mensajes = {
    400: 'La solicitud contiene datos inválidos.',
    401: 'Se requiere autenticación.',
    403: 'Acceso denegado.',
    404: 'Recurso no encontrado.',
    409: 'Conflicto con el estado actual del recurso.',
    413: 'La solicitud es demasiado grande.',
    415: 'Tipo de contenido no soportado.',
    429: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
    500: 'Ocurrió un error interno en el servidor.'
  };

  return res.status(status).json({ error: mensajes[status] });
}

module.exports = {
  corsSeguro,
  verificarOrigen,
  proteccionCsrf,
  requestLogger,
  limitadorGlobal,
  limitadorAutenticacion,
  limitadorRecuperacion,
  manejador404,
  manejadorErrores
};
