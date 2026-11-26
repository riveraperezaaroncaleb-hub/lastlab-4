'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SolicitudEliminacionDato extends Model {
    static associate(models) {
      SolicitudEliminacionDato.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
    }
  }

  SolicitudEliminacionDato.init({
    id_solicitud: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDIENTE'
    },
    datos_anonimizados: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    retencion_legal_contable: {
      type: DataTypes.TEXT
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    fecha_resolucion: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SolicitudEliminacionDato',
    tableName: 'SolicitudesEliminacionDatos'
  });

  return SolicitudEliminacionDato;
};
