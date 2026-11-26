'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UsuarioRol extends Model {
    static associate(models) {
      UsuarioRol.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
      UsuarioRol.belongsTo(models.Rol, { foreignKey: 'id_rol', as: 'rol' });
      UsuarioRol.belongsTo(models.Usuario, { foreignKey: 'asignado_por_usuario', as: 'asignadoPor' });
    }
  }

  UsuarioRol.init({
    id_usuario_rol: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    asignado_por_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    asignado_en: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'UsuarioRol',
    tableName: 'UsuariosRoles'
  });

  return UsuarioRol;
};
