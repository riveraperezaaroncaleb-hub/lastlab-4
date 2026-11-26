'use strict';

const { z } = require('zod');
const {
  CategoriaOperativa,
  ItemCatalogo,
  GastoOperativo,
  MovimientoInventario,
  AlertaAnomalia,
  sequelize
} = require('../models');
const logger = require('../utils/logger');

// Esquemas Zod
const categoriaSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  nombre: z.string().min(2).max(100),
  tipo: z.enum(['INGRESO', 'GASTO', 'INV']),
  presupuesto_mensual: z.number().min(0).default(0),
  umbral_desviacion_pct: z.number().min(0).max(100).default(10.0)
});

const itemSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  id_categoria: z.number().int().positive(),
  sku: z.string().min(1).max(50),
  codigo_cabys: z.string().max(30).optional(),
  nombre: z.string().min(2).max(150),
  tipo_item: z.enum(['PRODUCTO', 'INSUMO', 'SERV']).default('PRODUCTO'),
  unidad_medida: z.string().default('UNID'),
  precio_venta_actual: z.number().positive(),
  costo_promedio_ponderado: z.number().min(0).default(0),
  stock_actual: z.number().min(0).default(0),
  stock_minimo: z.number().min(0).default(5),
  dias_cobertura_estimados: z.number().int().min(0).default(30),
  activo: z.boolean().default(true)
});

const ajusteInventarioSchema = z.object({
  id_item: z.number().int().positive(),
  tipo_movimiento: z.enum(['AJUSTE', 'ENTRADA', 'SALIDA']),
  cantidad: z.number().positive(),
  motivo_auditoria: z.string().min(5).max(255)
});

const gastoSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  id_categoria: z.number().int().positive(),
  id_proveedor: z.number().int().positive().nullable().optional(),
  descripcion: z.string().min(3).max(255),
  monto: z.number().positive(),
  moneda: z.enum(['CRC', 'USD']).default('CRC'),
  fecha_gasto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  es_recurrente: z.boolean().default(false),
  estado_reconciliacion: z.enum(['PENDIENTE', 'CONCILIADO', 'OBSERVADO']).default('PENDIENTE'),
  url_respaldo_archivo: z.string().max(255).optional()
});

// CATEGORÍAS
async function listarCategorias(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const categorias = await CategoriaOperativa.findAll({
      where: { id_empresa },
      order: [['nombre', 'ASC']]
    });
    return res.status(200).json(categorias);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar categorías');
    return res.status(500).json({ error: 'Error al listar categorías operativas.' });
  }
}

async function crearCategoria(req, res) {
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = categoriaSchema.parse({ ...req.body, id_empresa });
    const categoria = await CategoriaOperativa.create(validado);
    return res.status(201).json(categoria);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de categoría inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al crear categoría');
    return res.status(500).json({ error: 'Error al registrar categoría.' });
  }
}

// ITEMS / CATÁLOGO
async function listarItems(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const items = await ItemCatalogo.findAll({
      where: { id_empresa },
      include: [{ model: CategoriaOperativa, as: 'categoria', attributes: ['id_categoria', 'nombre', 'tipo'] }],
      order: [['nombre', 'ASC']]
    });
    return res.status(200).json(items);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar items');
    return res.status(500).json({ error: 'Error al listar catálogo.' });
  }
}

async function crearItem(req, res) {
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = itemSchema.parse({ ...req.body, id_empresa });
    const item = await ItemCatalogo.create(validado);
    return res.status(201).json(item);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de item inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al crear item de catálogo');
    return res.status(500).json({ error: 'Error al registrar producto/servicio.' });
  }
}

// MOVIMIENTOS / AJUSTES INVENTARIO AUDITADOS
async function listarMovimientos(req, res) {
  try {
    const id_item = req.query.id_item ? Number(req.query.id_item) : null;
    const where = id_item ? { id_item } : {};
    const movimientos = await MovimientoInventario.findAll({
      where,
      include: [{ model: ItemCatalogo, as: 'item', attributes: ['id_item', 'sku', 'nombre'] }],
      order: [['fecha_movimiento', 'DESC']],
      limit: 100
    });
    return res.status(200).json(movimientos);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar movimientos de inventario');
    return res.status(500).json({ error: 'Error al listar movimientos.' });
  }
}

async function registrarAjusteInventario(req, res) {
  const t = await sequelize.transaction();
  try {
    const validado = ajusteInventarioSchema.parse(req.body);
    const item = await ItemCatalogo.findByPk(validado.id_item, { transaction: t, lock: t.LOCK.UPDATE });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ error: 'Item no encontrado.' });
    }

    const stockAnterior = Number(item.stock_actual);
    let stockResultante = stockAnterior;

    if (validado.tipo_movimiento === 'ENTRADA') {
      stockResultante = Number((stockAnterior + validado.cantidad).toFixed(2));
    } else if (validado.tipo_movimiento === 'SALIDA') {
      if (stockAnterior < validado.cantidad) {
        await t.rollback();
        return res.status(400).json({ error: 'Stock insuficiente para aplicar salida de ajuste.' });
      }
      stockResultante = Number((stockAnterior - validado.cantidad).toFixed(2));
    } else {
      // AJUSTE directo
      stockResultante = Number(validado.cantidad.toFixed(2));
    }

    await item.update({ stock_actual: stockResultante }, { transaction: t });

    const movimiento = await MovimientoInventario.create({
      id_item: item.id_item,
      id_usuario: req.user.id,
      tipo_movimiento: validado.tipo_movimiento,
      cantidad: validado.cantidad,
      stock_anterior: stockAnterior,
      stock_resultante: stockResultante,
      costo_unitario_historico: item.costo_promedio_ponderado,
      motivo_auditoria: `Ajuste manual auditado: ${validado.motivo_auditoria}`
    }, { transaction: t });

    await t.commit();
    return res.status(201).json(movimiento);
  } catch (error) {
    await t.rollback();
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de ajuste inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al registrar ajuste de inventario');
    return res.status(500).json({ error: 'Error al procesar ajuste de inventario.' });
  }
}

// GASTOS OPERATIVOS
async function listarGastos(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const gastos = await GastoOperativo.findAll({
      where: { id_empresa },
      include: [
        { model: CategoriaOperativa, as: 'categoria', attributes: ['id_categoria', 'nombre', 'presupuesto_mensual'] }
      ],
      order: [['fecha_gasto', 'DESC']],
      limit: 100
    });
    return res.status(200).json(gastos);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar gastos');
    return res.status(500).json({ error: 'Error al obtener gastos operativos.' });
  }
}

async function registrarGasto(req, res) {
  const t = await sequelize.transaction();
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = gastoSchema.parse({ ...req.body, id_empresa });

    const gasto = await GastoOperativo.create({
      ...validado,
      id_usuario: req.user.id
    }, { transaction: t });

    // Detección de Fugas / Desviación Presupuestaria Automática
    const categoria = await CategoriaOperativa.findByPk(validado.id_categoria, { transaction: t });
    if (categoria && Number(categoria.presupuesto_mensual) > 0) {
      const presupuesto = Number(categoria.presupuesto_mensual);
      const umbralDesviacion = Number(categoria.umbral_desviacion_pct) || 10;
      const limitePermitido = presupuesto * (1 + (umbralDesviacion / 100));

      // Sumar gastos acumulados del mes actual en esta categoría
      const fecha = new Date(validado.fecha_gasto);
      const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const totalGastadoMes = await GastoOperativo.sum('monto', {
        where: {
          id_empresa,
          id_categoria: categoria.id_categoria
        },
        transaction: t
      }) || 0;

      if (totalGastadoMes > limitePermitido) {
        await AlertaAnomalia.create({
          id_empresa,
          id_gasto: gasto.id_gasto,
          tipo_alerta: 'FUGA',
          severidad: totalGastadoMes > (presupuesto * 1.5) ? 'CRITICA' : 'ALTA',
          impacto_economico_estimado: Number((totalGastadoMes - presupuesto).toFixed(2)),
          diagnostico_detalle: `Presupuesto excedido en categoría "${categoria.nombre}". Gastado: ${totalGastadoMes}, Presupuesto: ${presupuesto} (+${umbralDesviacion}% tolerancia).`,
          estado: 'PENDIENTE'
        }, { transaction: t });
      }
    }

    await t.commit();
    return res.status(201).json(gasto);
  } catch (error) {
    await t.rollback();
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de gasto inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al registrar gasto');
    return res.status(500).json({ error: 'Error al registrar gasto operativo.' });
  }
}

module.exports = {
  listarCategorias,
  crearCategoria,
  listarItems,
  crearItem,
  listarMovimientos,
  registrarAjusteInventario,
  listarGastos,
  registrarGasto
};
