'use strict';

require('dotenv').config();
const path = require('node:path');
const db = require('../securevault/models');
const logger = require('../securevault/utils/logger');

async function runMigration() {
  console.log('>>> [Migrate] Iniciando actualización de base de datos MySQL con Sequelize...');
  try {
    await db.sequelize.authenticate();
    console.log('>>> [Migrate] Conexión con MySQL autenticada exitosamente.');

    // Sincronizar todos los modelos con la base de datos
    console.log('>>> [Migrate] Sincronizando tablas y relaciones en MySQL...');
    await db.sequelize.sync({ alter: false });
    console.log('>>> [Migrate] Tablas verificadas y creadas correctamente en MySQL.');

    // Sembrar roles iniciales RBAC si no existen
    if (db.Rol) {
      const rolesDefecto = [
        { nombre_rol: 'administrador', descripcion: 'Acceso total administrativo, fiscal y auditoría', nivel_acceso: 10, es_rol_operativo: false },
        { nombre_rol: 'usuario', descripcion: 'Usuario estándar con acceso a bóveda y operaciones básicas', nivel_acceso: 1, es_rol_operativo: true },
        { nombre_rol: 'cajero_pos', descripcion: 'Operador de caja POS y emisión de comprobantes bimoneda', nivel_acceso: 2, es_rol_operativo: true },
        { nombre_rol: 'auditor_hacienda', descripcion: 'Auditor de cumplimiento tributario DGT y Ley 8968', nivel_acceso: 5, es_rol_operativo: false }
      ];

      for (const rol of rolesDefecto) {
        await db.Rol.findOrCreate({
          where: { nombre_rol: rol.nombre_rol },
          defaults: rol
        });
      }
      console.log('>>> [Migrate] Roles RBAC base verificados.');
    }

    // Sembrar Empresa principal inicial si no existe
    if (db.Empresa) {
      await db.Empresa.findOrCreate({
        where: { cedula_juridica: '3-101-789012' },
        defaults: {
          cedula_juridica: '3-101-789012',
          razon_social: 'SECUREVAULT ENTERPRISE SOCIEDAD ANONIMA',
          nombre_comercial: 'SecureVault ERP & POS',
          rubro_negocio: 'Tecnología y Bóveda Criptográfica',
          regimen_tributario_dgt: 'REGIMEN_TRADICIONAL_DGT',
          codigo_actividad_cabys_default: '8314101000000',
          moneda_base: 'CRC',
          umbral_alerta_margen: 15.00,
          dias_cobertura_minima: 30,
          limite_descuento_pos_pct: 10.00,
          estado: 'ACTIVO'
        }
      });
      console.log('>>> [Migrate] Tenant Empresa por defecto verificado.');
    }

    console.log('>>> [Migrate] Proceso de migración completado exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('>>> [Migrate Error] Fallo al migrar base de datos:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
