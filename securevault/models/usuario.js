'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      // Legacy SecureVault Core
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

      // Enterprise Multi-Tenant & RBAC
      if (models.Empresa) {
        Usuario.belongsTo(models.Empresa, {
          foreignKey: 'id_empresa',
          as: 'empresa',
          onDelete: 'SET NULL'
        });
      }
      if (models.Rol && models.UsuarioRol) {
        Usuario.belongsToMany(models.Rol, {
          through: models.UsuarioRol,
          foreignKey: 'id_usuario',
          otherKey: 'id_rol',
          as: 'roles'
        });
      }
      if (models.ConsentimientoLegal) {
        Usuario.hasMany(models.ConsentimientoLegal, {
          foreignKey: 'id_usuario',
          as: 'consentimientos',
          onDelete: 'CASCADE'
        });
      }
      if (models.SolicitudEliminacionDato) {
        Usuario.hasMany(models.SolicitudEliminacionDato, {
          foreignKey: 'id_usuario',
          as: 'solicitudesEliminacion',
          onDelete: 'CASCADE'
        });
      }
      if (models.BitacoraAuditoriaAcceso) {
        Usuario.hasMany(models.BitacoraAuditoriaAcceso, {
          foreignKey: 'id_usuario',
          as: 'auditoriasAcceso',
          onDelete: 'SET NULL'
        });
      }
      if (models.Venta) {
        Usuario.hasMany(models.Venta, {
          foreignKey: 'id_usuario',
          as: 'ventas',
          onDelete: 'RESTRICT'
        });
      }
      if (models.CompraProveedor) {
        Usuario.hasMany(models.CompraProveedor, {
          foreignKey: 'id_usuario',
          as: 'compras',
          onDelete: 'RESTRICT'
        });
      }
      if (models.GastoOperativo) {
        Usuario.hasMany(models.GastoOperativo, {
          foreignKey: 'id_usuario',
          as: 'gastos',
          onDelete: 'RESTRICT'
        });
      }
      if (models.MovimientoInventario) {
        Usuario.hasMany(models.MovimientoInventario, {
          foreignKey: 'id_usuario',
          as: 'movimientosInventario',
          onDelete: 'RESTRICT'
        });
      }
      if (models.BitacoraAgenteIa) {
        Usuario.hasMany(models.BitacoraAgenteIa, {
          foreignKey: 'id_usuario',
          as: 'ejecucionesIa',
          onDelete: 'SET NULL'
        });
      }
    }
  }

  Usuario.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Multi-Empresa tenant link
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true }
    },
    nombre_completo: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    correo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    identificacion: {
      type: DataTypes.STRING(30),
      allowNull: true
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
    mfa_habilitado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    token_recuperacion_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'ACTIVO'
    },
    ultimo_acceso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    departamento_area: {
      type: DataTypes.STRING(100),
      allowNull: true
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
      attributes: { exclude: ['passwordHash', 'datoSensible', 'token_recuperacion_hash'] }
    }
  });

  return Usuario;
};
