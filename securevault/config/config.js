'use strict';

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const entero = (valor, porDefecto) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
};

const usarSsl = ['1', 'true', 'yes', 'on'].includes(String(process.env.DB_SSL || '').toLowerCase());
const sslRechazarNoAutorizado = !['0', 'false', 'no', 'off'].includes(
  String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase()
);

// Compatibilidad total con variables locales (.env) y de Railway (MYSQLHOST, MYSQLUSER, etc.)
const base = {
  username: process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || null,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'securevault_db',
  host: process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || '127.0.0.1',
  port: entero(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT, 3306),
  dialect: 'mysql',
  logging: false,
  dialectOptions: usarSsl ? { ssl: { rejectUnauthorized: sslRechazarNoAutorizado } } : {}
};

module.exports = {
  development: base,
  test: { ...base, database: process.env.DB_NAME_TEST || `${base.database}_test` },
  production: base
};
