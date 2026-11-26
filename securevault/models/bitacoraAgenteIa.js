'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BitacoraAgenteIa extends Model {
    static associate(models) {
      BitacoraAgenteIa.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      BitacoraAgenteIa.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
      BitacoraAgenteIa.hasMany(models.AlertaAnomalia, { foreignKey: 'id_ejecucion_ia', as: 'alertasGeneradas', onDelete: 'SET NULL' });
    }
  }

  BitacoraAgenteIa.init({
    id_ejecucion: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    numero_agente: {
      type: DataTypes.INTEGER,
      allowNull: false // 1..8
    },
    nombre_agente: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    proveedor_modelo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    resumen_entrada: {
      type: DataTypes.TEXT
    },
    resumen_salida: {
      type: DataTypes.TEXT
    },
    tokens_consumidos: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    estado_ejecucion: {
      type: DataTypes.STRING(20),
      defaultValue: 'EXITOSA'
    },
    ejecutada_en: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'BitacoraAgenteIa',
    tableName: 'BitacoraAgentesIa'
  });

  return BitacoraAgenteIa;
};
