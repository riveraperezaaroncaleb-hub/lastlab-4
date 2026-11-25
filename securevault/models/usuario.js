'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Nota, {
        foreignKey: 'usuarioId',
        as: 'notas',
        onDelete: 'CASCADE'
      });
      Usuario.hasMany(models.TokenRecuperacion, {
        foreignKey: 'usuarioId',
        as: 'tokensRecuperacion',
        onDelete: 'CASCADE'
      });
      Usuario.hasMany(models.EventoSeguridad, {
        foreignKey: 'usuarioId',
        as: 'eventosSeguridad',
        onDelete: 'SET NULL'
      });
    }
  }

  Usuario.init({
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    rol: {
      type: DataTypes.ENUM('usuario', 'administrador'),
      allowNull: false,
      defaultValue: 'usuario'
    },
    datoSensible: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    datoSensibleMascara: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '***-***-****'
    },
    sesionVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Usuario',
    tableName: 'Usuarios',
    defaultScope: {
      attributes: { exclude: ['passwordHash', 'datoSensible'] }
    }
  });

  return Usuario;
};
