'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DetalleCompra extends Model {
    static associate(models) {
      DetalleCompra.belongsTo(models.CompraProveedor, { foreignKey: 'id_compra', as: 'compra' });
      DetalleCompra.belongsTo(models.ItemCatalogo, { foreignKey: 'id_item', as: 'item' });
    }
  }

  DetalleCompra.init({
    id_detalle_compra: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_compra: {
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
    costo_unitario_compra: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    subtotal_linea: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'DetalleCompra',
    tableName: 'DetalleCompras'
  });

  return DetalleCompra;
};
