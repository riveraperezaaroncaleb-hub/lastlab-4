'use strict';

const { z } = require('zod');
const { Empresa, IndicadorEconomico, PoliticaMargenCabys, Usuario } = require('../models');
const logger = require('../utils/logger');

const empresaSchema = z.object({
  cedula_juridica: z.string().min(9).max(30),
  razon_social: z.string().min(2).max(200),
  nombre_comercial: z.string().max(200).optional(),
  rubro_negocio: z.string().max(100).optional(),
  regimen_tributario_dgt: z.string().max(50).optional(),
  codigo_actividad_cabys_default: z.string().max(20).optional(),
  moneda_base: z.enum(['CRC', 'USD']).default('CRC'),
  umbral_alerta_margen: z.number().min(0).max(100).default(15.00),
  dias_cobertura_minima: z.number().int().min(1).default(30),
  limite_descuento_pos_pct: z.number().min(0).max(100).default(10.00),
  estado: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO')
});

const indicadorOverrideSchema = z.object({
  tipo_cambio_compra: z.number().positive(),
  tipo_cambio_venta: z.number().positive(),
  fecha_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  justificacion_override: z.string().min(5).max(500)
});

const politicaCabysSchema = z.object({
  codigo_cabys_familia: z.string().min(2).max(30),
  nombre_familia: z.string().min(2).max(150),
  margen_minimo_pct: z.number().min(0).max(100),
  margen_objetivo_pct: z.number().min(0).max(100),
  dias_runway_minimo: z.number().int().min(1).default(15),
  activo: z.boolean().default(true)
});

async function listarEmpresas(req, res) {
  try {
    const empresas = await Empresa.findAll({
      order: [['id_empresa', 'ASC']]
    });
    return res.status(200).json(empresas);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar empresas');
    return res.status(500).json({ error: 'Error al obtener empresas.' });
  }
}

async function obtenerEmpresaPorId(req, res) {
  try {
    const id = Number(req.params.id);
    const empresa = await Empresa.findByPk(id, {
      include: [
        { model: IndicadorEconomico, as: 'indicadores', limit: 10, order: [['fecha_referencia', 'DESC']] },
        { model: PoliticaMargenCabys, as: 'politicasCabys' }
      ]
    });
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }
    return res.status(200).json(empresa);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al obtener empresa');
    return res.status(500).json({ error: 'Error al obtener empresa.' });
  }
}

async function crearEmpresa(req, res) {
  try {
    const validado = empresaSchema.parse(req.body);
    const existente = await Empresa.findOne({ where: { cedula_juridica: validado.cedula_juridica } });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una empresa registrada con esa cédula jurídica.' });
    }
    const nueva = await Empresa.create(validado);
    return res.status(201).json(nueva);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de empresa inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al crear empresa');
    return res.status(500).json({ error: 'Error interno al registrar empresa.' });
  }
}

async function actualizarEmpresa(req, res) {
  try {
    const id = Number(req.params.id);
    const validado = empresaSchema.partial().parse(req.body);
    const empresa = await Empresa.findByPk(id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada.' });
    }
    await empresa.update(validado);
    return res.status(200).json(empresa);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al actualizar empresa');
    return res.status(500).json({ error: 'Error al actualizar empresa.' });
  }
}

async function listarIndicadoresBccr(req, res) {
  try {
    const id_empresa = req.params.id ? Number(req.params.id) : null;
    const where = id_empresa ? { id_empresa } : {};
    const indicadores = await IndicadorEconomico.findAll({
      where,
      order: [['fecha_referencia', 'DESC']],
      limit: 30
    });
    return res.status(200).json(indicadores);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar indicadores BCCR');
    return res.status(500).json({ error: 'Error al obtener indicadores económicos.' });
  }
}

async function registrarOverrideTipoCambio(req, res) {
  try {
    const id_empresa = Number(req.params.id);
    const validado = indicadorOverrideSchema.parse(req.body);

    const indicador = await IndicadorEconomico.create({
      id_empresa,
      fuente: 'OVERRIDE',
      fecha_referencia: validado.fecha_referencia,
      tipo_cambio_compra: validado.tipo_cambio_compra,
      tipo_cambio_venta: validado.tipo_cambio_venta,
      es_override_manual: true,
      id_usuario_override: req.user.id,
      justificacion_override: validado.justificacion_override,
      estado_sincronizacion: 'MANUAL_OVERRIDE',
      consultado_en: new Date()
    });

    return res.status(201).json(indicador);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Parámetros de override inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al registrar override de tipo de cambio');
    return res.status(500).json({ error: 'Error al registrar override de tipo de cambio.' });
  }
}

async function listarPoliticasCabys(req, res) {
  try {
    const id_empresa = Number(req.params.id);
    const politicas = await PoliticaMargenCabys.findAll({
      where: { id_empresa },
      order: [['id_politica', 'ASC']]
    });
    return res.status(200).json(politicas);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar políticas CABYS');
    return res.status(500).json({ error: 'Error al listar políticas de margen.' });
  }
}

async function guardarPoliticaCabys(req, res) {
  try {
    const id_empresa = Number(req.params.id);
    const validado = politicaCabysSchema.parse(req.body);

    const [politica, creada] = await PoliticaMargenCabys.findOrCreate({
      where: {
        id_empresa,
        codigo_cabys_familia: validado.codigo_cabys_familia
      },
      defaults: {
        ...validado,
        id_empresa
      }
    });

    if (!creada) {
      await politica.update(validado);
    }

    return res.status(creada ? 201 : 200).json(politica);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de política inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al guardar política CABYS');
    return res.status(500).json({ error: 'Error al guardar política de margen.' });
  }
}

module.exports = {
  listarEmpresas,
  obtenerEmpresaPorId,
  crearEmpresa,
  actualizarEmpresa,
  listarIndicadoresBccr,
  registrarOverrideTipoCambio,
  listarPoliticasCabys,
  guardarPoliticaCabys
};
