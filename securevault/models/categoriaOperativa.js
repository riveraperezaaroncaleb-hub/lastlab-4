'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CategoriaOperativa extends Model {
    static associate(models) {
      CategoriaOperativa.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      CategoriaOperativa.hasMany(models.ItemCatalogo, { foreignKey: 'id_categoria', as: 'items', onDelete: 'RESTRICT' });
      CategoriaOperativa.hasMany(models.GastoOperativo, { foreignKey: 'id_categoria', as: 'gastos', onDelete: 'RESTRICT' });
    }
  }

  CategoriaOperativa.init({
    id_categoria: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false // INGRESO / GASTO / INV
    },
    presupuesto_mensual: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    umbral_desviacion_pct: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    }
  }, {
    sequelize,
    modelName: 'CategoriaOperativa',
    tableName: 'CategoriasOperativas'
  });

  return CategoriaOperativa;
};
