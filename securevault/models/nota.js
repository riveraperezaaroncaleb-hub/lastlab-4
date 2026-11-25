'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Nota extends Model {
    static associate(models) {
      Nota.belongsTo(models.Usuario, {
        foreignKey: 'usuarioId',
        as: 'usuario',
        onDelete: 'CASCADE'
      });
    }
  }

  Nota.init({
    titulo: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    contenidoCifrado: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Nota',
    tableName: 'Notas'
  });

  return Nota;
};
