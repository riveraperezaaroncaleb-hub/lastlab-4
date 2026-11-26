'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IndicadorEconomico extends Model {
    static associate(models) {
      IndicadorEconomico.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      IndicadorEconomico.belongsTo(models.Usuario, { foreignKey: 'id_usuario_override', as: 'usuarioOverride' });
    }
  }

  IndicadorEconomico.init({
    id_indicador: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fuente: {
      type: DataTypes.STRING(20),
      defaultValue: 'BCCR'
    },
    fecha_referencia: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    tipo_cambio_compra: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false
    },
    tipo_cambio_venta: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false
    },
    es_override_manual: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    id_usuario_override: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    justificacion_override: {
      type: DataTypes.TEXT
    },
    estado_sincronizacion: {
      type: DataTypes.STRING(20),
      defaultValue: 'SINCRONIZADO'
    },
    consultado_en: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'IndicadorEconomico',
    tableName: 'IndicadoresEconomicos'
  });

  return IndicadorEconomico;
};
