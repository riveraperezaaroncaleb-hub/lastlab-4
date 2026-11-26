'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const argon2 = require('argon2');

// Cargar variables de entorno desde la ruta relativa del proyecto o CWD
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

/**
 * Obtiene y valida la llave de cifrado AES desde las variables de entorno.
 * Requiere que DATA_ENCRYPTION_KEY esté en base64 y contenga exactamente 32 bytes (256 bits).
 * @returns {Buffer} Clave de 32 bytes
 */
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
  const secreto = process.env.SESSION_SECRET || process.env.DATA_ENCRYPTION_KEY || 'default_securevault_session_secret_32_bytes_min!';
  if (typeof secreto !== 'string' || secreto.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  }
  return crypto.createHash('sha256').update(secreto).digest();
}

async function hashPassword(plainPassword) {
    if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
        throw new Error('La contraseña debe ser una cadena de texto no vacía');
    }

    return await argon2.hash(plainPassword, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,       // 2 iteraciones
        parallelism: 1
    });
}

/**
 * Verifica una contraseña en texto plano contra un hash Argon2.
 * @param {string} hash Hash almacenado
 * @param {string} plainPassword Contraseña ingresada
 * @returns {Promise<boolean>} True si coincide, false si no
 */
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

/**
 * Cifra un campo sensible utilizando AES-256-GCM.
 * Genera un IV aleatorio único de 12 bytes por operación y autenticación con tag de 16 bytes.
 * @param {string} plaintext Dato sensible en texto plano
 * @returns {string} iv.tag.ciphertext en formato base64
 */
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

/**
 * Descifra un payload previamente cifrado con encryptField.
 * @param {string} payload iv.tag.ciphertext en formato base64
 * @returns {string} Texto plano recuperado
 */
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

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

/**
 * Enmascara un dato sensible devolviendo el formato ***-***-XXXX mostrando solo los últimos 4 caracteres.
 * @param {string|number} value Dato a enmascarar
 * @returns {string} Dato enmascarado
 */
function maskField(value) {
    if (value === null || value === undefined) {
        return '***-***-****';
    }

    const str = String(value);
    const lastFour = str.length >= 4 ? str.slice(-4) : str.padStart(4, '*');
    return `***-***-${lastFour}`;
}

/**
 * Genera un token criptográficamente seguro de 32 bytes aleatorios en formato hexadecimal.
 * @returns {string} Token aleatorio en hexadecimal (64 caracteres)
 */
function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashea un token sin procesar utilizando SHA-256 en formato hexadecimal.
 * @param {string} rawToken Token en texto plano
 * @returns {string} Hash SHA-256 en formato hexadecimal
 */
function hashResetToken(rawToken) {
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
        throw new Error('El token a hashear debe ser una cadena de texto no vacía');
    }

    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
    hashPassword,
    verifyPassword,
    encryptField,
    decryptField,
    maskField,
    generateResetToken,
    hashResetToken
};
