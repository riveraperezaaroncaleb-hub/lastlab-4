'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Venta extends Model {
    static associate(models) {
      Venta.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      Venta.belongsTo(models.Tercero, { foreignKey: 'id_cliente', as: 'cliente' });
      Venta.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
      Venta.hasMany(models.DetalleVenta, { foreignKey: 'id_venta', as: 'detalles', onDelete: 'CASCADE' });
      Venta.hasMany(models.AlertaAnomalia, { foreignKey: 'id_venta', as: 'alertas', onDelete: 'SET NULL' });
    }
  }

  Venta.init({
    id_venta: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    numero_comprobante: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    turno_caja: {
      type: DataTypes.STRING(30)
    },
    fecha_venta: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    moneda: {
      type: DataTypes.STRING(10),
      defaultValue: 'CRC' // CRC / USD
    },
    tipo_cambio_aplicado: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 1.0000
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    descuento_aplicado_pct: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    impuestos: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    total_venta: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    costo_total_operativo: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    margen_neto_calculado: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    porcentaje_margen: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'Venta',
    tableName: 'Ventas'
  });

  return Venta;
};
