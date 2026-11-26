'use strict';

const crypto = require('node:crypto');
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function enteroEnv(nombre, valorPorDefecto, minimo, maximo) {
  const valor = Number(process.env[nombre]);
  if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
    return valorPorDefecto;
  }
  return valor;
}

function booleanoEnv(nombre, valorPorDefecto) {
  const valor = process.env[nombre];
  if (valor === undefined) return valorPorDefecto;
  return ['1', 'true', 'yes', 'on'].includes(String(valor).toLowerCase());
}

function origenesEnv() {
  const configurados = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origen) => origen.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (configurados.length > 0) return new Set(configurados);

  return isProduction
    ? new Set()
    : new Set([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ]);
}

function obtenerSecretoSesion() {
  const secreto = process.env.SESSION_SECRET || process.env.DATA_ENCRYPTION_KEY || 'default_securevault_session_secret_32_bytes_min!';
  if (typeof secreto !== 'string' || secreto.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  }
  return crypto.createHash('sha256').update(secreto).digest();
}

const sessionTtlMs = enteroEnv('SESSION_TTL_MINUTES', 480, 5, 10080) * 60 * 1000;

module.exports = {
  nodeEnv,
  isProduction,
  port: enteroEnv('PORT', 3000, 1, 65535),
  logLevel: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'),
  trustProxy: booleanoEnv('TRUST_PROXY', false),
  origenesPermitidos: origenesEnv(),
  sesion: {
    ttlMs: sessionTtlMs,
    cookieName: 'securevault_sid',
    csrfCookieName: 'securevault_csrf',
    csrfHeaderName: 'x-csrf-token',
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      path: '/',
      maxAge: sessionTtlMs
    },
    csrfCookie: {
      httpOnly: false,
      sameSite: 'strict',
      secure: isProduction,
      path: '/',
      maxAge: sessionTtlMs
    }
  },
  limites: {
    global: {
      windowMs: enteroEnv('RATE_LIMIT_WINDOW_MINUTES', 15, 1, 60) * 60 * 1000,
      limit: enteroEnv('RATE_LIMIT_MAX', 300, 10, 10000)
    },
    autenticacion: {
      windowMs: 15 * 60 * 1000,
      limit: enteroEnv('AUTH_RATE_LIMIT_MAX', 10, 3, 100)
    },
    recuperacion: {
      windowMs: 60 * 60 * 1000,
      limit: enteroEnv('RECOVERY_RATE_LIMIT_MAX', 5, 1, 50)
    }
  },
  obtenerSecretoSesion
};
