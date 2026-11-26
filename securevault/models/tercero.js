'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tercero extends Model {
    static associate(models) {
      Tercero.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      Tercero.hasMany(models.Venta, { foreignKey: 'id_cliente', as: 'ventasCliente', onDelete: 'SET NULL' });
      Tercero.hasMany(models.CompraProveedor, { foreignKey: 'id_proveedor', as: 'comprasProveedor', onDelete: 'RESTRICT' });
      Tercero.hasMany(models.GastoOperativo, { foreignKey: 'id_proveedor', as: 'gastos', onDelete: 'SET NULL' });
    }
  }

  Tercero.init({
    id_tercero: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo_tercero: {
      type: DataTypes.STRING(20),
      allowNull: false // CLIENTE / PROVEEDOR
    },
    identificacion: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    nombre_legal: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    actividad_hacienda: {
      type: DataTypes.STRING(100)
    },
    estado_tributario: {
      type: DataTypes.STRING(50),
      defaultValue: 'INSCRITO'
    },
    correo: {
      type: DataTypes.STRING(150)
    },
    telefono: {
      type: DataTypes.STRING(30)
    },
    validado_hacienda: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ultima_consulta_atv: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Tercero',
    tableName: 'Terceros'
  });

  return Tercero;
};
