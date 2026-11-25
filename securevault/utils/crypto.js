'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const argon2 = require('argon2');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const PREFIJO_SESION = 'sv1';

function getEncryptionKey() {
  const rawKey = process.env.DATA_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('Falta la variable de entorno DATA_ENCRYPTION_KEY');
  }

  const key = Buffer.from(rawKey, 'base64');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY debe ser de 32 bytes al decodificarse desde base64');
  }

  return key;
}

function getSessionKey() {
  const secreto = process.env.SESSION_SECRET;
  if (typeof secreto !== 'string' || secreto.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  }
  return crypto.createHash('sha256').update(secreto).digest();
}

async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('La contraseña debe ser una cadena de texto no vacía');
  }

  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

async function verifyPassword(hash, plainPassword) {
  if (!hash || typeof hash !== 'string' || !plainPassword || typeof plainPassword !== 'string') {
    return false;
  }

  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

let dummyHashPromise = null;

async function verificarPasswordSeguro(hash, plainPassword) {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('ContrasenaFalsa1!').catch(() => null);
  }

  const resultadoReal = hash ? await verifyPassword(hash, plainPassword) : false;
  const resultadoFalso = await verifyPassword(await dummyHashPromise, plainPassword);
  return resultadoReal || resultadoFalso;
}

function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptField(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  const parts = String(payload).split('.');
  if (parts.length !== 3) {
    throw new Error('Formato cifrado inválido. Se esperaba iv.tag.ciphertext');
  }

  const [ivB64, tagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error('Parámetros de autenticación o IV con longitud inválida');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function createSessionToken({ id, email, version, exp }) {
  if (!Number.isSafeInteger(id) || id <= 0 || typeof email !== 'string' || !email) {
    throw new Error('Datos de sesión inválidos');
  }

  const payload = JSON.stringify({
    id,
    email: email.toLowerCase(),
    version: Number.isSafeInteger(version) ? version : 0,
    exp
  });

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getSessionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIJO_SESION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url')
  ].join('.');
}

function verifySessionToken(token) {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIJO_SESION) return null;

  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const ciphertext = Buffer.from(parts[3], 'base64url');

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null;

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getSessionKey(), iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    );

    if (
      !Number.isSafeInteger(payload.id) ||
      payload.id <= 0 ||
      typeof payload.email !== 'string' ||
      !Number.isSafeInteger(payload.version) ||
      !Number.isFinite(payload.exp) ||
      Date.now() >= payload.exp
    ) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      version: payload.version,
      exp: payload.exp
    };
  } catch {
    return null;
  }
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function safeEqual(valorA, valorB) {
  if (typeof valorA !== 'string' || typeof valorB !== 'string') return false;

  const bufferA = Buffer.from(valorA, 'utf8');
  const bufferB = Buffer.from(valorB, 'utf8');
  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function maskField(value) {
  if (value === null || value === undefined) {
    return '***-***-****';
  }

  const str = String(value);
  const lastFour = str.length >= 4 ? str.slice(-4) : str.padStart(4, '*');
  return `***-***-${lastFour}`;
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashResetToken(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length === 0) {
    throw new Error('El token a hashear debe ser una cadena de texto no vacía');
  }

  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  verificarPasswordSeguro,
  encryptField,
  decryptField,
  createSessionToken,
  verifySessionToken,
  createCsrfToken,
  safeEqual,
  maskField,
  generateResetToken,
  hashResetToken
};
