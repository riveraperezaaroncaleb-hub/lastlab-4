'use strict';

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const db = require('./models');
const config = require('./config/security');
const logger = require('./utils/logger');
const seguridad = require('./middlewares/seguridadMiddleware');
const usuarioRoutes = require('./routes/usuarioRoutes');
const notaRoutes = require('./routes/notaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const operacionRoutes = require('./routes/operacionRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const iaAlertasRoutes = require('./routes/iaAlertasRoutes');
const cumplimientoRoutes = require('./routes/cumplimientoRoutes');

const app = express();
const publicDir = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy ? 1 : false);

app.use(seguridad.requestLogger);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", ...config.origenesPermitidos],
      upgradeInsecureRequests: config.isProduction ? [] : null
    }
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: config.isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false
}));

app.use(seguridad.corsSeguro);
app.use(seguridad.verificarOrigen);
app.use(seguridad.limitadorGlobal);
app.use(express.json({ limit: '16kb', strict: true }));
app.use(cookieParser());
app.use(seguridad.proteccionCsrf);

app.use(express.static(publicDir, {
  index: false,
  dotfiles: 'deny',
  etag: true,
  maxAge: config.isProduction ? '1y' : 0
}));

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  res.setHeader('Cache-Control', 'no-store');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(200).send('SecureVault API Core activa.');
});

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/notas', notaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/operaciones', operacionRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/ia-alertas', iaAlertasRoutes);
app.use('/api/cumplimiento', cumplimientoRoutes);

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && req.path !== '/health') {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.sendFile(indexPath);
    }
  }
  return next();
});

app.use(seguridad.manejador404);
app.use(seguridad.manejadorErrores);

async function startServer() {
  try {
    await db.sequelize.authenticate();
    logger.info('Conexión con la base de datos verificada.');
    await db.sequelize.sync({ alter: false });
    logger.info('Esquema de base de datos MySQL sincronizado correctamente.');
  } catch (error) {
    logger.warn({ err: error.message }, 'Base de datos no disponible al iniciar.');
  }

  app.listen(config.port, () => {
    logger.info(`Servidor SecureVault iniciado en el puerto ${config.port}.`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, logger, startServer };
