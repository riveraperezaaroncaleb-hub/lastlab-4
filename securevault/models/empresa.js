'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Empresa extends Model {
    static associate(models) {
      Empresa.hasMany(models.Usuario, { foreignKey: 'id_empresa', as: 'usuarios', onDelete: 'SET NULL' });
      Empresa.hasMany(models.IndicadorEconomico, { foreignKey: 'id_empresa', as: 'indicadores', onDelete: 'CASCADE' });
      Empresa.hasMany(models.PoliticaMargenCabys, { foreignKey: 'id_empresa', as: 'politicasCabys', onDelete: 'CASCADE' });
      Empresa.hasMany(models.CategoriaOperativa, { foreignKey: 'id_empresa', as: 'categorias', onDelete: 'CASCADE' });
      Empresa.hasMany(models.ItemCatalogo, { foreignKey: 'id_empresa', as: 'items', onDelete: 'CASCADE' });
      Empresa.hasMany(models.Tercero, { foreignKey: 'id_empresa', as: 'terceros', onDelete: 'CASCADE' });
      Empresa.hasMany(models.GastoOperativo, { foreignKey: 'id_empresa', as: 'gastos', onDelete: 'CASCADE' });
      Empresa.hasMany(models.Venta, { foreignKey: 'id_empresa', as: 'ventas', onDelete: 'CASCADE' });
      Empresa.hasMany(models.CompraProveedor, { foreignKey: 'id_empresa', as: 'compras', onDelete: 'CASCADE' });
      Empresa.hasMany(models.BitacoraAgenteIa, { foreignKey: 'id_empresa', as: 'ejecucionesIa', onDelete: 'CASCADE' });
      Empresa.hasMany(models.AlertaAnomalia, { foreignKey: 'id_empresa', as: 'alertas', onDelete: 'CASCADE' });
      Empresa.hasMany(models.BitacoraAuditoriaAcceso, { foreignKey: 'id_empresa', as: 'auditoriasAcceso', onDelete: 'SET NULL' });
    }
  }

  Empresa.init({
    id_empresa: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    cedula_juridica: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    razon_social: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    nombre_comercial: {
      type: DataTypes.STRING(200)
    },
    rubro_negocio: {
      type: DataTypes.STRING(100)
    },
    regimen_tributario_dgt: {
      type: DataTypes.STRING(50)
    },
    codigo_actividad_cabys_default: {
      type: DataTypes.STRING(20)
    },
    moneda_base: {
      type: DataTypes.STRING(10),
      defaultValue: 'CRC'
    },
    umbral_alerta_margen: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 15.00
    },
    dias_cobertura_minima: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    limite_descuento_pos_pct: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'ACTIVO'
    },
    creado_en: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Empresa',
    tableName: 'Empresas'
  });

  return Empresa;
};
