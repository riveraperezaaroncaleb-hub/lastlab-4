'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DetalleVenta extends Model {
    static associate(models) {
      DetalleVenta.belongsTo(models.Venta, { foreignKey: 'id_venta', as: 'venta' });
      DetalleVenta.belongsTo(models.ItemCatalogo, { foreignKey: 'id_item', as: 'item' });
    }
  }

  DetalleVenta.init({
    id_detalle_venta: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_item: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    costo_unitario_momento: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    subtotal_linea: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    margen_linea: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'DetalleVenta',
    tableName: 'DetalleVentas'
  });

  return DetalleVenta;
};
