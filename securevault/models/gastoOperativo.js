'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GastoOperativo extends Model {
    static associate(models) {
      GastoOperativo.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      GastoOperativo.belongsTo(models.CategoriaOperativa, { foreignKey: 'id_categoria', as: 'categoria' });
      GastoOperativo.belongsTo(models.Tercero, { foreignKey: 'id_proveedor', as: 'proveedor' });
      GastoOperativo.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
      GastoOperativo.hasMany(models.AlertaAnomalia, { foreignKey: 'id_gasto', as: 'alertas', onDelete: 'SET NULL' });
    }
  }

  GastoOperativo.init({
    id_gasto: {
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
    id_proveedor: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    monto: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    moneda: {
      type: DataTypes.STRING(10),
      defaultValue: 'CRC'
    },
    fecha_gasto: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    es_recurrente: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    estado_reconciliacion: {
      type: DataTypes.STRING(30),
      defaultValue: 'PENDIENTE'
    },
    url_respaldo_archivo: {
      type: DataTypes.STRING(255)
    }
  }, {
    sequelize,
    modelName: 'GastoOperativo',
    tableName: 'GastosOperativos'
  });

  return GastoOperativo;
};
