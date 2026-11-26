'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompraProveedor extends Model {
    static associate(models) {
      CompraProveedor.belongsTo(models.Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
      CompraProveedor.belongsTo(models.Tercero, { foreignKey: 'id_proveedor', as: 'proveedor' });
      CompraProveedor.belongsTo(models.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
      CompraProveedor.hasMany(models.DetalleCompra, { foreignKey: 'id_compra', as: 'detalles', onDelete: 'CASCADE' });
    }
  }

  CompraProveedor.init({
    id_compra: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_proveedor: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    numero_factura: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    clave_numerica_hacienda: {
      type: DataTypes.STRING(50)
    },
    fecha_emision: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    moneda: {
      type: DataTypes.STRING(10),
      defaultValue: 'CRC' // CRC / USD
    },
    tipo_cambio_aplicado: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 1.0000
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    impuestos: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0.00
    },
    total_compra: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    origen_registro: {
      type: DataTypes.STRING(20),
      defaultValue: 'MANUAL' // XML_IA / MANUAL
    },
    url_respaldo_archivo: {
      type: DataTypes.STRING(255)
    }
  }, {
    sequelize,
    modelName: 'CompraProveedor',
    tableName: 'ComprasProveedores'
  });

  return CompraProveedor;
};
