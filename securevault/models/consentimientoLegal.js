'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConsentimientoLegal extends Model {
    static associate(models) {
      ConsentimientoLegal.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
    }
  }

  ConsentimientoLegal.init({
    id_consentimiento: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    version_terminos: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    version_privacidad: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    acepto_terminos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    acepto_privacidad: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    hash_probatorio_sha256: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    ip_registro: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    fecha_aceptacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ConsentimientoLegal',
    tableName: 'ConsentimientosLegales'
  });

  return ConsentimientoLegal;
};
