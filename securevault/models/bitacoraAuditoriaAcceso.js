'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BitacoraAuditoriaAcceso extends Model {
    static associate(models) {
      BitacoraAuditoriaAcceso.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      BitacoraAuditoriaAcceso.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
    }
  }

  BitacoraAuditoriaAcceso.init({
    id_evento_acceso: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_evento: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    ip_origen: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    detalle_cambio: {
      type: DataTypes.TEXT
    },
    ocurrido_en: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'BitacoraAuditoriaAcceso',
    tableName: 'BitacoraAuditoriaAccesos'
  });

  return BitacoraAuditoriaAcceso;
};
