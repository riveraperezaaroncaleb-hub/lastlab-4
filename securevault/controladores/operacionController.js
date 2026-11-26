'use strict';

const { z } = require('zod');
const {
  Tercero,
  Venta,
  DetalleVenta,
  CompraProveedor,
  DetalleCompra,
  ItemCatalogo,
  MovimientoInventario,
  AlertaAnomalia,
  Empresa,
  sequelize
} = require('../models');
const logger = require('../utils/logger');

// Esquemas Zod
const terceroSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  tipo_tercero: z.enum(['CLIENTE', 'PROVEEDOR']),
  identificacion: z.string().min(9).max(30),
  nombre_legal: z.string().min(2).max(200),
  actividad_hacienda: z.string().max(100).optional(),
  estado_tributario: z.string().default('INSCRITO'),
  correo: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(30).optional(),
  validado_hacienda: z.boolean().default(false)
});

const ventaSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  id_cliente: z.number().int().positive().nullable().optional(),
  numero_comprobante: z.string().min(1).max(50),
  turno_caja: z.string().max(30).optional(),
  moneda: z.enum(['CRC', 'USD']).default('CRC'),
  tipo_cambio_aplicado: z.number().positive().default(1.0000),
  descuento_aplicado_pct: z.number().min(0).max(100).default(0),
  impuestos: z.number().min(0).default(0),
  lineas: z.array(z.object({
    id_item: z.number().int().positive(),
    cantidad: z.number().positive(),
    precio_unitario: z.number().positive()
  })).min(1)
});

const compraSchema = z.object({
  id_empresa: z.number().int().positive().optional(),
  id_proveedor: z.number().int().positive(),
  numero_factura: z.string().min(1).max(50),
  clave_numerica_hacienda: z.string().max(50).optional(),
  fecha_emision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moneda: z.enum(['CRC', 'USD']).default('CRC'),
  tipo_cambio_aplicado: z.number().positive().default(1.0000),
  impuestos: z.number().min(0).default(0),
  origen_registro: z.enum(['XML_IA', 'MANUAL']).default('MANUAL'),
  url_respaldo_archivo: z.string().max(255).optional(),
  lineas: z.array(z.object({
    id_item: z.number().int().positive(),
    cantidad: z.number().positive(),
    costo_unitario_compra: z.number().positive()
  })).min(1)
});

// TERCEROS
async function listarTerceros(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const tipo = req.query.tipo;
    const where = { id_empresa };
    if (tipo) where.tipo_tercero = tipo;

    const terceros = await Tercero.findAll({ where, order: [['nombre_legal', 'ASC']] });
    return res.status(200).json(terceros);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar terceros');
    return res.status(500).json({ error: 'Error al obtener terceros.' });
  }
}

async function crearTercero(req, res) {
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = terceroSchema.parse({ ...req.body, id_empresa });
    const tercero = await Tercero.create(validado);
    return res.status(201).json(tercero);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de tercero inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al crear tercero');
    return res.status(500).json({ error: 'Error al registrar tercero.' });
  }
}

// VENTAS POS
async function listarVentas(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const ventas = await Venta.findAll({
      where: { id_empresa },
      include: [
        { model: Tercero, as: 'cliente', attributes: ['id_tercero', 'nombre_legal', 'identificacion'] },
        { model: DetalleVenta, as: 'detalles', include: [{ model: ItemCatalogo, as: 'item', attributes: ['id_item', 'sku', 'nombre'] }] }
      ],
      order: [['fecha_venta', 'DESC']],
      limit: 50
    });
    return res.status(200).json(ventas);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar ventas');
    return res.status(500).json({ error: 'Error al obtener ventas.' });
  }
}

async function registrarVentaPos(req, res) {
  const t = await sequelize.transaction();
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = ventaSchema.parse({ ...req.body, id_empresa });

    let subtotalCalculado = 0;
    let costoTotalOperativo = 0;
    const lineasProcesadas = [];

    // Validar ítems y calcular costos/márgenes
    for (const linea of validado.lineas) {
      const item = await ItemCatalogo.findOne({
        where: { id_item: linea.id_item, id_empresa },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!item) {
        await t.rollback();
        return res.status(404).json({ error: `Item catálogo ${linea.id_item} no encontrado en la empresa.` });
      }

      const stockActual = Number(item.stock_actual);
      if (stockActual < linea.cantidad) {
        await t.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para ${item.nombre} (SKU: ${item.sku}). Disponible: ${stockActual}, Solicitado: ${linea.cantidad}`
        });
      }

      const precioUnit = Number(linea.precio_unitario);
      const costoUnit = Number(item.costo_promedio_ponderado) || 0;
      const subtotalLinea = Number((precioUnit * linea.cantidad).toFixed(2));
      const costoLinea = Number((costoUnit * linea.cantidad).toFixed(2));
      const margenLinea = Number((subtotalLinea - costoLinea).toFixed(2));

      subtotalCalculado += subtotalLinea;
      costoTotalOperativo += costoLinea;

      lineasProcesadas.push({
        id_item: item.id_item,
        cantidad: linea.cantidad,
        precio_unitario: precioUnit,
        costo_unitario_momento: costoUnit,
        subtotal_linea: subtotalLinea,
        margen_linea: margenLinea,
        itemInstance: item,
        stockAnterior: stockActual
      });
    }

    const descuentoMonto = Number((subtotalCalculado * (validado.descuento_aplicado_pct / 100)).toFixed(2));
    const subtotalConDescuento = subtotalCalculado - descuentoMonto;
    const totalVenta = Number((subtotalConDescuento + validado.impuestos).toFixed(2));
    const margenNeto = Number((totalVenta - costoTotalOperativo).toFixed(2));
    const porcentajeMargen = totalVenta > 0 ? Number(((margenNeto / totalVenta) * 100).toFixed(2)) : 0;

    // Crear cabecera venta
    const venta = await Venta.create({
      id_empresa,
      id_cliente: validado.id_cliente,
      id_usuario: req.user.id,
      numero_comprobante: validado.numero_comprobante,
      turno_caja: validado.turno_caja || 'TURNO_DEFAULT',
      moneda: validado.moneda,
      tipo_cambio_aplicado: validado.tipo_cambio_aplicado,
      subtotal: subtotalCalculado,
      descuento_aplicado_pct: validado.descuento_aplicado_pct,
      impuestos: validado.impuestos,
      total_venta: totalVenta,
      costo_total_operativo: costoTotalOperativo,
      margen_neto_calculado: margenNeto,
      porcentaje_margen: porcentajeMargen
    }, { transaction: t });

    // Crear líneas y movimientos de inventario
    for (const linea of lineasProcesadas) {
      await DetalleVenta.create({
        id_venta: venta.id_venta,
        id_item: linea.id_item,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        costo_unitario_momento: linea.costo_unitario_momento,
        subtotal_linea: linea.subtotal_linea,
        margen_linea: linea.margen_linea
      }, { transaction: t });

      const nuevoStock = Number((linea.stockAnterior - linea.cantidad).toFixed(2));
      await linea.itemInstance.update({ stock_actual: nuevoStock }, { transaction: t });

      await MovimientoInventario.create({
        id_item: linea.id_item,
        id_usuario: req.user.id,
        tipo_movimiento: 'SALIDA',
        cantidad: linea.cantidad,
        stock_anterior: linea.stockAnterior,
        stock_resultante: nuevoStock,
        costo_unitario_historico: linea.costo_unitario_momento,
        motivo_auditoria: `Venta POS #${venta.numero_comprobante}`
      }, { transaction: t });
    }

    // Verificar si salta alerta de margen bajo o descuento excesivo
    const empresa = await Empresa.findByPk(id_empresa, { transaction: t });
    const umbralMargen = empresa ? Number(empresa.umbral_alerta_margen) : 15.0;
    const limiteDescuento = empresa ? Number(empresa.limite_descuento_pos_pct) : 10.0;

    if (porcentajeMargen < umbralMargen || validado.descuento_aplicado_pct > limiteDescuento) {
      await AlertaAnomalia.create({
        id_empresa,
        id_venta: venta.id_venta,
        tipo_alerta: 'MARGEN',
        severidad: porcentajeMargen < 5 ? 'CRITICA' : 'ALTA',
        impacto_economico_estimado: Math.max(0, Number((costoTotalOperativo - totalVenta).toFixed(2))),
        diagnostico_detalle: `Venta POS #${venta.numero_comprobante} registró margen del ${porcentajeMargen}% (umbral: ${umbralMargen}%) o descuento del ${validado.descuento_aplicado_pct}% (límite: ${limiteDescuento}%).`,
        estado: 'PENDIENTE'
      }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json(venta);
  } catch (error) {
    await t.rollback();
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de venta inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al procesar venta POS');
    return res.status(500).json({ error: 'Error al procesar la venta en el servidor.' });
  }
}

// COMPRAS PROVEEDORES Y RECÁLCULO CPP
async function listarCompras(req, res) {
  try {
    const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : (req.user.id_empresa || 1);
    const compras = await CompraProveedor.findAll({
      where: { id_empresa },
      include: [
        { model: Tercero, as: 'proveedor', attributes: ['id_tercero', 'nombre_legal', 'identificacion'] },
        { model: DetalleCompra, as: 'detalles', include: [{ model: ItemCatalogo, as: 'item', attributes: ['id_item', 'sku', 'nombre'] }] }
      ],
      order: [['fecha_emision', 'DESC']],
      limit: 50
    });
    return res.status(200).json(compras);
  } catch (error) {
    logger.error({ err: error.message }, 'Error al listar compras');
    return res.status(500).json({ error: 'Error al obtener compras a proveedores.' });
  }
}

async function registrarCompraProveedor(req, res) {
  const t = await sequelize.transaction();
  try {
    const id_empresa = req.body.id_empresa || req.user.id_empresa || 1;
    const validado = compraSchema.parse({ ...req.body, id_empresa });

    let subtotalCalculado = 0;
    const lineasProcesadas = [];

    for (const linea of validado.lineas) {
      const item = await ItemCatalogo.findOne({
        where: { id_item: linea.id_item, id_empresa },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!item) {
        await t.rollback();
        return res.status(404).json({ error: `Item catálogo ${linea.id_item} no encontrado.` });
      }

      const costoUnit = Number(linea.costo_unitario_compra);
      const subtotalLinea = Number((costoUnit * linea.cantidad).toFixed(2));
      subtotalCalculado += subtotalLinea;

      lineasProcesadas.push({
        id_item: item.id_item,
        cantidad: linea.cantidad,
        costo_unitario_compra: costoUnit,
        subtotal_linea: subtotalLinea,
        itemInstance: item,
        stockAnterior: Number(item.stock_actual),
        cppAnterior: Number(item.costo_promedio_ponderado)
      });
    }

    const totalCompra = Number((subtotalCalculado + validado.impuestos).toFixed(2));

    const compra = await CompraProveedor.create({
      id_empresa,
      id_proveedor: validado.id_proveedor,
      id_usuario: req.user.id,
      numero_factura: validado.numero_factura,
      clave_numerica_hacienda: validado.clave_numerica_hacienda,
      fecha_emision: validado.fecha_emision,
      moneda: validado.moneda,
      tipo_cambio_aplicado: validado.tipo_cambio_aplicado,
      subtotal: subtotalCalculado,
      impuestos: validado.impuestos,
      total_compra: totalCompra,
      origen_registro: validado.origen_registro,
      url_respaldo_archivo: validado.url_respaldo_archivo
    }, { transaction: t });

    // Detalle y recálculo de Costo Promedio Ponderado (CPP)
    for (const linea of lineasProcesadas) {
      await DetalleCompra.create({
        id_compra: compra.id_compra,
        id_item: linea.id_item,
        cantidad: linea.cantidad,
        costo_unitario_compra: linea.costo_unitario_compra,
        subtotal_linea: linea.subtotal_linea
      }, { transaction: t });

      // Fórmula CPP = ((StockAnt * CppAnt) + (CantNueva * CostoNuevo)) / (StockAnt + CantNueva)
      const stockNuevo = Number((linea.stockAnterior + linea.cantidad).toFixed(2));
      let nuevoCpp = linea.costo_unitario_compra;

      if (stockNuevo > 0) {
        const valorInventarioPrevio = Math.max(0, linea.stockAnterior) * linea.cppAnterior;
        const valorCompraNueva = linea.cantidad * linea.costo_unitario_compra;
        nuevoCpp = Number(((valorInventarioPrevio + valorCompraNueva) / stockNuevo).toFixed(2));
      }

      await linea.itemInstance.update({
        stock_actual: stockNuevo,
        costo_promedio_ponderado: nuevoCpp
      }, { transaction: t });

      await MovimientoInventario.create({
        id_item: linea.id_item,
        id_usuario: req.user.id,
        tipo_movimiento: 'ENTRADA',
        cantidad: linea.cantidad,
        stock_anterior: linea.stockAnterior,
        stock_resultante: stockNuevo,
        costo_unitario_historico: linea.costo_unitario_compra,
        motivo_auditoria: `Compra Factura #${compra.numero_factura} (Recálculo CPP: ${linea.cppAnterior} -> ${nuevoCpp})`
      }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json(compra);
  } catch (error) {
    await t.rollback();
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Datos de compra inválidos', detalles: error.errors });
    }
    logger.error({ err: error.message }, 'Error al registrar compra proveedor');
    return res.status(500).json({ error: 'Error al registrar la compra en el servidor.' });
  }
}

module.exports = {
  listarTerceros,
  crearTercero,
  listarVentas,
  registrarVentaPos,
  listarCompras,
  registrarCompraProveedor
};
