'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TokenRecuperacion extends Model {
    static associate(models) {
      TokenRecuperacion.belongsTo(models.Usuario, {
        foreignKey: 'usuarioId',
        as: 'usuario',
        onDelete: 'CASCADE'
      });
    }
  }

  TokenRecuperacion.init({
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    expiraEn: {
      type: DataTypes.DATE,
      allowNull: false
    },
    usado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'TokenRecuperacion',
    tableName: 'TokensRecuperacion'
  });

  return TokenRecuperacion;
};
