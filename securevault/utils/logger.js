'use strict';

const pino = require('pino');
const { logLevel } = require('../config/security');

module.exports = pino({
  level: logLevel,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.body.password',
      'req.body.token',
      'req.body.datoSensible',
      'password',
      'passwordHash',
      'token',
      'cookie',
      'datoSensible',
      'csrfToken',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.cookie',
      '*.csrfToken'
    ],
    censor: '[CONFIDENCIAL]'
  }
});
