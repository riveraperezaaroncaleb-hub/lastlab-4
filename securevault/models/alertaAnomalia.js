'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AlertaAnomalia extends Model {
    static associate(models) {
      AlertaAnomalia.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      AlertaAnomalia.belongsTo(models.ItemCatalogo, { foreignKey: 'id_item', as: 'item' });
      AlertaAnomalia.belongsTo(models.GastoOperativo, { foreignKey: 'id_gasto', as: 'gasto' });
      AlertaAnomalia.belongsTo(models.Venta, { foreignKey: 'id_venta', as: 'venta' });
      AlertaAnomalia.belongsTo(models.BitacoraAgenteIa, { foreignKey: 'id_ejecucion_ia', as: 'ejecucionIa' });
      AlertaAnomalia.belongsTo(models.Usuario, { foreignKey: 'resuelta_por', as: 'resolutor' });
    }
  }

  AlertaAnomalia.init({
    id_alerta: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_item: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_gasto: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_ejecucion_ia: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_alerta: {
      type: DataTypes.STRING(30),
      allowNull: false // FUGA / MARGEN / RUNWAY
    },
    severidad: {
      type: DataTypes.STRING(20),
      allowNull: false // BAJA / MEDIA / ALTA / CRITICA
    },
    impacto_economico_estimado: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    diagnostico_detalle: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDIENTE' // PENDIENTE / EN_REVISION / RESUELTA / DESCARTADA
    },
    resuelta_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    justificacion_cierre: {
      type: DataTypes.TEXT
    },
    creada_en: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    resuelta_en: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AlertaAnomalia',
    tableName: 'AlertasAnomalias'
  });

  return AlertaAnomalia;
};
