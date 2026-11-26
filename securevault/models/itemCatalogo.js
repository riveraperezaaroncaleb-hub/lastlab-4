'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ItemCatalogo extends Model {
    static associate(models) {
      ItemCatalogo.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      ItemCatalogo.belongsTo(models.CategoriaOperativa, { foreignKey: 'id_categoria', as: 'categoria' });
      ItemCatalogo.hasMany(models.MovimientoInventario, { foreignKey: 'id_item', as: 'movimientos', onDelete: 'CASCADE' });
      ItemCatalogo.hasMany(models.DetalleVenta, { foreignKey: 'id_item', as: 'detallesVenta', onDelete: 'RESTRICT' });
      ItemCatalogo.hasMany(models.DetalleCompra, { foreignKey: 'id_item', as: 'detallesCompra', onDelete: 'RESTRICT' });
      ItemCatalogo.hasMany(models.AlertaAnomalia, { foreignKey: 'id_item', as: 'alertas', onDelete: 'SET NULL' });
    }
  }

  ItemCatalogo.init({
    id_item: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    codigo_cabys: {
      type: DataTypes.STRING(30)
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    tipo_item: {
      type: DataTypes.STRING(20),
      defaultValue: 'PRODUCTO' // PRODUCTO / INSUMO / SERV
    },
    unidad_medida: {
      type: DataTypes.STRING(20),
      defaultValue: 'UNID'
    },
    precio_venta_actual: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    costo_promedio_ponderado: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    stock_actual: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    stock_minimo: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 5.00
    },
    dias_cobertura_estimados: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ItemCatalogo',
    tableName: 'ItemsCatalogo'
  });

  return ItemCatalogo;
};
