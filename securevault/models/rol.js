'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Rol extends Model {
    static associate(models) {
      Rol.belongsToMany(models.Usuario, {
        through: models.UsuarioRol,
        foreignKey: 'id_rol',
        otherKey: 'id_usuario',
        as: 'usuarios'
      });
      Rol.hasMany(models.UsuarioRol, {
        foreignKey: 'id_rol',
        as: 'asignaciones'
      });
    }
  }

  Rol.init({
    id_rol: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombre_rol: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    descripcion: {
      type: DataTypes.STRING(255)
    },
    nivel_acceso: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    matriz_permisos_json: {
      type: DataTypes.TEXT
    },
    es_rol_operativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Rol',
    tableName: 'Roles'
  });

  return Rol;
};
