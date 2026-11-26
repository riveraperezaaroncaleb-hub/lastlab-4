'use strict';

const { z } = require('zod');
const {
  BitacoraAgenteIa,
  AlertaAnomalia,
  ItemCatalogo,
  GastoOperativo,
  Venta,
  Usuario,
  Empresa
} = require('../models');
const logger = require('../utils/logger');

const ejecucionIaSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  numero_agente: z.number().int().min(1).max(8),
  nombre_agente: z.string().min(2).max(100),
  proveedor_modelo: z.string().min(2).max(50),
  resumen_entrada: z.string().optional(),
  resumen_salida: z.string().optional(),
  tokens_consumidos: z.number().int().min(0).default(0),
  estado_ejecucion: z.enum(['EXITOSA', 'FALLIDA', 'TIMEOUT']).default('EXITOSA')
});

const resolverAlertaSchema = z.object({
  estado: z.enum(['RESUELTA', 'DESCARTADA', 'EN_REVISION']),
  justificacion_cierre: z.string().min(5).max(1000)
});

// AGENTES IA
async function listarEjecucionesIa(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const numero_agente = req.query.agente ? Number(req.query.agente) : null;
    const where = { id_empresa };
    if (numero_agente) where.numero_agente = numero_agente;

    const ejecuciones = await BitacoraAgenteIa.findAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
      order: [['ejecutada_en', 'DESC']],
      limit: 50
    });
    return res.status(200).json(ejecuciones);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar bitácora de agentes IA');
    return res.status(500).json({ error: 'Error al obtener bitácora de agentes IA.' });
  }
}

async function registrarEjecucionIa(req, res) {
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = ejecucionIaSchema.parse({ ...req.body, id_empresa });

    const ejecucion = await BitacoraAgenteIa.create({
      ...validado,
      id_usuario: req.user.id
    });

    return res.status(201).json(ejecucion);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Parámetros de ejecución IA inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al registrar ejecución IA');
    return res.status(500).json({ error: 'Error al registrar bitácora de IA.' });
  }
}

// ALERTAS DE ANOMALÍAS
async function listarAlertas(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const estado = req.query.estado;
    const where = { id_empresa };
    if (estado) where.estado = estado;

    const alertas = await AlertaAnomalia.findAll({
      where,
      include: [
        { model: ItemCatalogo, as: 'item', attributes: ['id_item', 'sku', 'nombre'] },
        { model: GastoOperativo, as: 'gasto', attributes: ['id_gasto', 'descripcion', 'monto'] },
        { model: Venta, as: 'venta', attributes: ['id_venta', 'numero_comprobante', 'total_venta'] },
        { model: Usuario, as: 'resolutor', attributes: ['id', 'nombre', 'email'] }
      ],
      order: [['creada_en', 'DESC']],
      limit: 100
    });
    return res.status(200).json(alertas);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar alertas de anomalías');
    return res.status(500).json({ error: 'Error al obtener alertas de anomalías.' });
  }
}

async function resolverAlerta(req, res) {
  try {
    const id_alerta = Number(req.params.id);
    const validado = resolverAlertaSchema.parse(req.body);

    const alerta = await AlertaAnomalia.findByPk(id_alerta);
    if (!alerta) {
      return res.status(404).json({ error: 'Alerta no encontrada.' });
    }

    await alerta.update({
      estado: validado.estado,
      justificacion_cierre: validado.justificacion_cierre,
      resuelta_por: req.user.id,
      resuelta_en: new Date()
    });

    return res.status(200).json(alerta);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de resolución inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al resolver alerta');
    return res.status(500).json({ error: 'Error al actualizar alerta.' });
  }
}

module.exports = {
  listarEjecucionesIa,
  registrarEjecucionIa,
  listarAlertas,
  resolverAlerta
};
