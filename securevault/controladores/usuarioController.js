'use strict';

const { Op } = require('sequelize');
const { z, ZodError } = require('zod');
const db = require('../models');
const { Usuario, TokenRecuperacion, EventoSeguridad } = db;
const config = require('../config/security');
const {
  hashPassword,
  verificarPasswordSeguro,
  encryptField,
  maskField,
  createSessionToken,
  createCsrfToken,
  generateResetToken,
  hashResetToken
} = require('../utils/crypto');

const registroSchema = z.object({
  nombre: z.string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .email('El formato del correo electrónico es inválido')
    .max(255, 'El correo electrónico no puede exceder 255 caracteres'),
  password: z.string({ required_error: 'La contraseña es obligatoria' })
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial o símbolo'),
  datoSensible: z.string({ required_error: 'El dato sensible es obligatorio' })
    .min(1, 'El dato sensible es obligatorio')
    .max(2000, 'El dato sensible excede la longitud permitida')
}).strict();

const loginSchema = z.object({
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .email('El formato del correo electrónico es inválido')
    .max(255, 'El correo electrónico no puede exceder 255 caracteres'),
  password: z.string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
}).strict();

const solicitarRecuperacionSchema = z.object({
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .email('El formato del correo electrónico es inválido')
    .max(255, 'El correo electrónico no puede exceder 255 caracteres')
}).strict();

const restablecerPasswordSchema = z.object({
  token: z.string({ required_error: 'El token de recuperación es obligatorio' })
    .trim()
    .regex(/^[a-f0-9]{64}$/i, 'El formato del token de recuperación es inválido'),
  password: z.string({ required_error: 'La nueva contraseña es obligatoria' })
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial o símbolo')
}).strict();

function responderValidacion(res, error) {
  return res.status(400).json({
    error: 'Datos de entrada inválidos',
    detalles: error.issues.map((issue) => ({
      campo: issue.path.join('.') || 'cuerpo',
      mensaje: issue.message
    }))
  });
}

function datosPublicos(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol
  };
}

function establecerSesion(req, res, usuario) {
  const csrfToken = createCsrfToken();
  const sessionToken = createSessionToken({
    id: usuario.id,
    email: usuario.email,
    version: usuario.sesionVersion,
    exp: Date.now() + config.sesion.ttlMs
  });

  res.cookie(config.sesion.cookieName, sessionToken, config.sesion.cookie);
  res.cookie(config.sesion.csrfCookieName, csrfToken, config.sesion.csrfCookie);
  req.authMethod = 'cookie';

  return csrfToken;
}

async function registrarUsuario(req, res, next) {
  try {
    const datos = registroSchema.parse(req.body);

    const existente = await Usuario.findOne({ where: { email: datos.email } });
    if (existente) {
      return res.status(409).json({ error: 'No se pudo crear la cuenta con esos datos.' });
    }

    await Usuario.create({
      nombre: datos.nombre,
      email: datos.email,
      passwordHash: await hashPassword(datos.password),
      rol: 'usuario',
      datoSensible: encryptField(datos.datoSensible),
      datoSensibleMascara: maskField(datos.datoSensible),
      sesionVersion: 0
    });

    await EventoSeguridad.registrar({
      tipoEvento: 'REGISTRO',
      usuarioId: null,
      ip: req.ip,
      detalle: 'Nueva cuenta creada con rol usuario'
    });

    return res.status(201).json({
      mensaje: 'Cuenta creada exitosamente.',
      datoSensible: maskField(datos.datoSensible)
    });
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'No se pudo crear la cuenta con esos datos.' });
    }
    return next(error);
  }
}

async function loginUsuario(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const usuario = await Usuario.unscoped().findOne({ where: { email } });
    const passwordValido = await verificarPasswordSeguro(usuario?.passwordHash, password);

    if (!usuario || !passwordValido) {
      await EventoSeguridad.registrar({
        tipoEvento: 'LOGIN_FALLIDO',
        usuarioId: usuario?.id ?? null,
        ip: req.ip,
        detalle: 'Intento de inicio de sesión con credenciales inválidas'
      });
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const csrfToken = establecerSesion(req, res, usuario);

    await EventoSeguridad.registrar({
      tipoEvento: 'LOGIN_EXITOSO',
      usuarioId: usuario.id,
      ip: req.ip,
      detalle: 'Inicio de sesión completado satisfactoriamente'
    });

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      csrfToken,
      usuario: datosPublicos(usuario)
    });
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    return next(error);
  }
}

async function obtenerSesion(req, res) {
  const csrfToken = req.cookies?.[config.sesion.csrfCookieName] || createCsrfToken();
  if (!req.cookies?.[config.sesion.csrfCookieName]) {
    res.cookie(config.sesion.csrfCookieName, csrfToken, config.sesion.csrfCookie);
  }

  return res.status(200).json({
    usuario: datosPublicos(req.user),
    csrfToken
  });
}

async function logoutUsuario(req, res) {
  res.clearCookie(config.sesion.cookieName, config.sesion.cookie);
  res.clearCookie(config.sesion.csrfCookieName, config.sesion.csrfCookie);
  req.authMethod = null;

  await EventoSeguridad.registrar({
    tipoEvento: 'LOGOUT',
    usuarioId: req.user?.id ?? null,
    ip: req.ip,
    detalle: 'Cierre de sesión'
  });

  return res.status(200).json({ mensaje: 'Sesión finalizada.' });
}

async function solicitarRecuperacion(req, res, next) {
  try {
    const { email } = solicitarRecuperacionSchema.parse(req.body);
    const usuario = await Usuario.findOne({ where: { email } });
    const rawToken = generateResetToken();

    if (usuario) {
      await TokenRecuperacion.create({
        usuarioId: usuario.id,
        tokenHash: hashResetToken(rawToken),
        expiraEn: new Date(Date.now() + 15 * 60 * 1000),
        usado: false
      });

      await EventoSeguridad.registrar({
        tipoEvento: 'SOLICITUD_RECUPERACION',
        usuarioId: usuario.id,
        ip: req.ip,
        detalle: 'Solicitud de restablecimiento de contraseña'
      });
    }

    return res.status(200).json({
      mensaje: 'Si el correo existe, se enviarán las instrucciones para restablecer la contraseña.'
    });
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    return next(error);
  }
}

async function restablecerPassword(req, res, next) {
  try {
    const { token, password } = restablecerPasswordSchema.parse(req.body);
    const tokenHash = hashResetToken(token);
    const transaccion = await db.sequelize.transaction();

    try {
      const registroToken = await TokenRecuperacion.findOne({
        where: {
          tokenHash,
          usado: false,
          expiraEn: { [Op.gt]: new Date() }
        },
        transaction: transaccion
      });

      if (!registroToken) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'El token de recuperación es inválido o ha expirado.' });
      }

      const usuario = await Usuario.unscoped().findByPk(registroToken.usuarioId, { transaction: transaccion });
      if (!usuario) {
        await transaccion.rollback();
        return res.status(400).json({ error: 'El token de recuperación es inválido o ha expirado.' });
      }

      usuario.passwordHash = await hashPassword(password);
      usuario.sesionVersion = (usuario.sesionVersion ?? 0) + 1;
      await usuario.save({ transaction: transaccion });

      await TokenRecuperacion.update(
        { usado: true },
        {
          where: { usuarioId: usuario.id, usado: false },
          transaction: transaccion
        }
      );

      await transaccion.commit();
      await EventoSeguridad.registrar({
        tipoEvento: 'RESET_PASSWORD',
        usuarioId: usuario.id,
        ip: req.ip,
        detalle: 'Contraseña restablecida y sesiones anteriores revocadas'
      });

      return res.status(200).json({
        mensaje: 'Contraseña restablecida exitosamente. Inicie sesión nuevamente.'
      });
    } catch (error) {
      await transaccion.rollback();
      throw error;
    }
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    return next(error);
  }
}

module.exports = {
  registrarUsuario,
  loginUsuario,
  obtenerSesion,
  logoutUsuario,
  solicitarRecuperacion,
  restablecerPassword
};
