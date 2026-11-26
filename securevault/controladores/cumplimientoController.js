'use strict';

const crypto = require('node:crypto');
const { z } = require('zod');
const {
  ConsentimientoLegal,
  SolicitudEliminacionDato,
  BitacoraAuditoriaAcceso,
  Usuario,
  Venta,
  CompraProveedor,
  GastoOperativo
} = require('../models');
const logger = require('../utils/logger');

const consentimientoSchema = z.object({
  version_terminos: z.string().min(1).max(20),
  version_privacidad: z.string().min(1).max(20),
  acepto_terminos: z.boolean().refine(val => val === true, 'Debe aceptar los términos'),
  acepto_privacidad: z.boolean().refine(val => val === true, 'Debe aceptar la política de privacidad')
});

const solicitudEliminacionSchema = z.object({
  motivo: z.string().min(10).max(1000)
});

const procesarSolicitudSchema = z.object({
  estado: z.enum(['APROBADA', 'RECHAZADA', 'RETENCION_PARCIAL']),
  retencion_legal_contable: z.string().max(1000).optional()
});

// CONSENTIMIENTOS LEY 8968
async function registrarConsentimiento(req, res) {
  try {
    const validado = consentimientoSchema.parse(req.body);
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const timestamp = new Date().toISOString();

    // Generar hash probatorio SHA-256 inmutable (Ley 8968)
    const probatorioRaw = `${req.user.id}:${validado.version_terminos}:${validado.version_privacidad}:${ip}:${timestamp}`;
    const hashProbatorio = crypto.createHash('sha256').update(probatorioRaw).digest('hex');

    const consentimiento = await ConsentimientoLegal.create({
      id_usuario: req.user.id,
      version_terminos: validado.version_terminos,
      version_privacidad: validado.version_privacidad,
      acepto_terminos: true,
      acepto_privacidad: true,
      hash_probatorio_sha256: hashProbatorio,
      ip_registro: ip.slice(0, 45),
      fecha_aceptacion: new Date()
    });

    return res.status(201).json(consentimiento);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validación de consentimiento fallida', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al registrar consentimiento legal');
    return res.status(500).json({ error: 'Error al registrar consentimiento legal.' });
  }
}

async function listarConsentimientos(req, res) {
  try {
    const consentimientos = await ConsentimientoLegal.findAll({
      where: req.user.rol === 'administrador' ? {} : { id_usuario: req.user.id },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
      order: [['fecha_aceptacion', 'DESC']],
      limit: 100
    });
    return res.status(200).json(consentimientos);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar consentimientos');
    return res.status(500).json({ error: 'Error al obtener consentimientos legales.' });
  }
}

// DERECHO DE SUPRESIÓN (ELIMINACIÓN DE DATOS)
async function solicitarEliminacion(req, res) {
  try {
    const validado = solicitudEliminacionSchema.parse(req.body);

    const solicitud = await SolicitudEliminacionDato.create({
      id_usuario: req.user.id,
      motivo: validado.motivo,
      estado: 'PENDIENTE',
      fecha_solicitud: new Date()
    });

    return res.status(201).json(solicitud);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Motivo requerido', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al solicitar eliminación de datos');
    return res.status(500).json({ error: 'Error al registrar solicitud de eliminación de datos.' });
  }
}

async function listarSolicitudesEliminacion(req, res) {
  try {
    const solicitudes = await SolicitudEliminacionDato.findAll({
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email', 'identificacion'] }],
      order: [['fecha_solicitud', 'DESC']]
    });
    return res.status(200).json(solicitudes);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar solicitudes de supresión');
    return res.status(500).json({ error: 'Error al listar solicitudes de supresión.' });
  }
}

async function procesarSolicitudEliminacion(req, res) {
  try {
    const id_solicitud = Number(req.params.id);
    const validado = procesarSolicitudSchema.parse(req.body);

    const solicitud = await SolicitudEliminacionDato.findByPk(id_solicitud);
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const usuario = await Usuario.findByPk(solicitud.id_usuario);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Verificar si existen registros contables/tributarios asociados (DGT Costa Rica: 5 años de retención)
    const ventasCount = await Venta.count({ where: { id_usuario: usuario.id } });
    const comprasCount = await CompraProveedor.count({ where: { id_usuario: usuario.id } });
    const gastosCount = await GastoOperativo.count({ where: { id_usuario: usuario.id } });

    const tieneRegistrosContables = (ventasCount + comprasCount + gastosCount) > 0;
    let datosAnonimizados = false;
    let notaRetencion = validado.retencion_legal_contable || '';

    if (tieneRegistrosContables) {
      // Anonimización obligatoria por cumplimiento fiscal
      datosAnonimizados = true;
      notaRetencion += ' [Retención contable obligatoria Art. 109 Código Normas Tributarias DGT. Datos personales anonimizados irreversiblemente]';
      await usuario.update({
        nombre: `USUARIO_ANON_${usuario.id}`,
        nombre_completo: `Anonimizado Ley 8968 #${usuario.id}`,
        email: `anonimo_${usuario.id}@securevault.internal`,
        correo: `anonimo_${usuario.id}@securevault.internal`,
        identificacion: 'ANONIMIZADO',
        datoSensible: 'ANONIMIZADO',
        estado: 'SUPRIMIDO'
      });
    } else {
      datosAnonimizados = true;
      await usuario.update({ estado: 'SUPRIMIDO' });
    }

    await solicitud.update({
      estado: validado.estado,
      datos_anonimizados: datosAnonimizados,
      retencion_legal_contable: notaRetencion,
      fecha_resolucion: new Date()
    });

    return res.status(200).json(solicitud);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de procesamiento inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al procesar solicitud de eliminación');
    return res.status(500).json({ error: 'Error al procesar solicitud de eliminación.' });
  }
}

// AUDITORÍA DE ACCESOS
async function listarAuditoriaAccesos(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const eventos = await BitacoraAuditoriaAcceso.findAll({
      where: { id_empresa },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
      order: [['ocurrido_en', 'DESC']],
      limit: 100
    });
    return res.status(200).json(eventos);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar auditoría de accesos');
    return res.status(500).json({ error: 'Error al obtener auditoría de accesos.' });
  }
}

module.exports = {
  registrarConsentimiento,
  listarConsentimientos,
  solicitarEliminacion,
  listarSolicitudesEliminacion,
  procesarSolicitudEliminacion,
  listarAuditoriaAccesos
};
