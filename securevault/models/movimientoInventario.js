'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovimientoInventario extends Model {
    static associate(models) {
      MovimientoInventario.belongsTo(models.ItemCatalogo, { foreignKey: 'id_item', as: 'item' });
      MovimientoInventario.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
    }
  }

  MovimientoInventario.init({
    id_movimiento: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_item: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo_movimiento: {
      type: DataTypes.STRING(20),
      allowNull: false // ENTRADA / SALIDA / AJUSTE
    },
    cantidad: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    stock_anterior: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    stock_resultante: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    costo_unitario_historico: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    motivo_auditoria: {
      type: DataTypes.STRING(255)
    },
    fecha_movimiento: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'MovimientoInventario',
    tableName: 'MovimientosInventario'
  });

  return MovimientoInventario;
};
