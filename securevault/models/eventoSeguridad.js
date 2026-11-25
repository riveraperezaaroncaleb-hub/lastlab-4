'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventoSeguridad extends Model {
    static associate(models) {
      EventoSeguridad.belongsTo(models.Usuario, {
        foreignKey: 'usuarioId',
        as: 'usuario',
        onDelete: 'SET NULL'
      });
    }

    /**
     * Helper seguro para registrar eventos en la bitácora de auditoría.
     * NUNCA incluye contraseñas, tokens ni texto plano/sensible.
     */
    static async registrar({ tipoEvento, usuarioId = null, ip = 'unknown', detalle }) {
      try {
        return await EventoSeguridad.create({
          tipoEvento,
          usuarioId,
          ip: String(ip).slice(0, 45),
          detalle: String(detalle).slice(0, 255)
        });
      } catch (err) {
        // En caso de error en bitácora, no interrumpir la transacción principal
        return null;
      }
    }
  }

  EventoSeguridad.init({
    tipoEvento: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    detalle: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'EventoSeguridad',
    tableName: 'EventosSeguridad'
  });

  return EventoSeguridad;
};
