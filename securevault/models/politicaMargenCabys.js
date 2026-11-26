'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoliticaMargenCabys extends Model {
    static associate(models) {
      PoliticaMargenCabys.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
    }
  }

  PoliticaMargenCabys.init({
    id_politica: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    codigo_cabys_familia: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    nombre_familia: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    margen_minimo_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    margen_objetivo_pct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    dias_runway_minimo: {
      type: DataTypes.INTEGER,
      defaultValue: 15
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'PoliticaMargenCabys',
    tableName: 'PoliticasMargenCabys'
  });

  return PoliticaMargenCabys;
};
