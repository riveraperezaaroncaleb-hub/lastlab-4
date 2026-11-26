'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // -------------------------------------------------------------
    // 1. MÓDULO EMPRESAS Y TENANTS
    // -------------------------------------------------------------
    await queryInterface.createTable('Empresas', {
      id_empresa: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cedula_juridica: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      razon_social: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      nombre_comercial: {
        type: Sequelize.STRING(200)
      },
      rubro_negocio: {
        type: Sequelize.STRING(100)
      },
      regimen_tributario_dgt: {
        type: Sequelize.STRING(50)
      },
      codigo_actividad_cabys_default: {
        type: Sequelize.STRING(20)
      },
      moneda_base: {
        type: Sequelize.STRING(10),
        defaultValue: 'CRC'
      },
      umbral_alerta_margen: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 15.00
      },
      dias_cobertura_minima: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      limite_descuento_pos_pct: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 10.00
      },
      estado: {
        type: Sequelize.STRING(20),
        defaultValue: 'ACTIVO'
      },
      creado_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 2. MÓDULO ROLES Y RBAC
    // -------------------------------------------------------------
    await queryInterface.createTable('Roles', {
      id_rol: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nombre_rol: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      descripcion: {
        type: Sequelize.STRING(255)
      },
      nivel_acceso: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      matriz_permisos_json: {
        type: Sequelize.TEXT
      },
      es_rol_operativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 3. ACTUALIZAR / ADAPTAR TABLA USUARIOS CON NUEVAS COLUMNAS RBAC
    // -------------------------------------------------------------
    // Verificar si existen columnas antes de agregarlas
    const tableDesc = await queryInterface.describeTable('Usuarios').catch(() => ({}));

    if (!tableDesc.id_empresa) {
      await queryInterface.addColumn('Usuarios', 'id_empresa', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!tableDesc.nombre_completo) {
      await queryInterface.addColumn('Usuarios', 'nombre_completo', {
        type: Sequelize.STRING(150),
        allowNull: true
      });
    }

    if (!tableDesc.correo) {
      await queryInterface.addColumn('Usuarios', 'correo', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!tableDesc.identificacion) {
      await queryInterface.addColumn('Usuarios', 'identificacion', {
        type: Sequelize.STRING(30),
        allowNull: true
      });
    }

    if (!tableDesc.mfa_habilitado) {
      await queryInterface.addColumn('Usuarios', 'mfa_habilitado', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDesc.token_recuperacion_hash) {
      await queryInterface.addColumn('Usuarios', 'token_recuperacion_hash', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!tableDesc.estado) {
      await queryInterface.addColumn('Usuarios', 'estado', {
        type: Sequelize.STRING(20),
        defaultValue: 'ACTIVO'
      });
    }

    if (!tableDesc.ultimo_acceso) {
      await queryInterface.addColumn('Usuarios', 'ultimo_acceso', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableDesc.departamento_area) {
      await queryInterface.addColumn('Usuarios', 'departamento_area', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    // -------------------------------------------------------------
    // 4. ASIGNACIONES DE ROLES A USUARIOS (USUARIOS_ROLES)
    // -------------------------------------------------------------
    await queryInterface.createTable('UsuariosRoles', {
      id_usuario_rol: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_rol: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Roles', key: 'id_rol' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      asignado_por_usuario: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      asignado_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 5. MACROECONOMÍA BCCR Y POLÍTICAS CABYS
    // -------------------------------------------------------------
    await queryInterface.createTable('IndicadoresEconomicos', {
      id_indicador: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fuente: {
        type: Sequelize.STRING(20),
        defaultValue: 'BCCR'
      },
      fecha_referencia: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      tipo_cambio_compra: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false
      },
      tipo_cambio_venta: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false
      },
      es_override_manual: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      id_usuario_override: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      justificacion_override: {
        type: Sequelize.TEXT
      },
      estado_sincronizacion: {
        type: Sequelize.STRING(20),
        defaultValue: 'SINCRONIZADO'
      },
      consultado_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('PoliticasMargenCabys', {
      id_politica: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      codigo_cabys_familia: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      nombre_familia: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      margen_minimo_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      margen_objetivo_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      dias_runway_minimo: {
        type: Sequelize.INTEGER,
        defaultValue: 15
      },
      activo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 6. CUMPLIMIENTO LEY 8968 (PRODHAB) Y AUDITORÍA
    // -------------------------------------------------------------
    await queryInterface.createTable('ConsentimientosLegales', {
      id_consentimiento: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version_terminos: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      version_privacidad: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      acepto_terminos: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      acepto_privacidad: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      hash_probatorio_sha256: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      ip_registro: {
        type: Sequelize.STRING(45),
        allowNull: false
      },
      fecha_aceptacion: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('SolicitudesEliminacionDatos', {
      id_solicitud: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      motivo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(20),
        defaultValue: 'PENDIENTE'
      },
      datos_anonimizados: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      retencion_legal_contable: {
        type: Sequelize.TEXT
      },
      fecha_solicitud: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      fecha_resolucion: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('BitacoraAuditoriaAccesos', {
      id_evento_acceso: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tipo_evento: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      ip_origen: {
        type: Sequelize.STRING(45),
        allowNull: false
      },
      detalle_cambio: {
        type: Sequelize.TEXT
      },
      ocurrido_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 7. CATÁLOGO, CPP Y GASTOS OPERATIVOS
    // -------------------------------------------------------------
    await queryInterface.createTable('CategoriasOperativas', {
      id_categoria: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING(20),
        allowNull: false // INGRESO / GASTO / INV
      },
      presupuesto_mensual: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      umbral_desviacion_pct: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 10.00
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('ItemsCatalogo', {
      id_item: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_categoria: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CategoriasOperativas', key: 'id_categoria' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      codigo_cabys: {
        type: Sequelize.STRING(30)
      },
      nombre: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      tipo_item: {
        type: Sequelize.STRING(20),
        defaultValue: 'PRODUCTO' // PRODUCTO / INSUMO / SERV
      },
      unidad_medida: {
        type: Sequelize.STRING(20),
        defaultValue: 'UNID'
      },
      precio_venta_actual: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      costo_promedio_ponderado: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      stock_actual: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00
      },
      stock_minimo: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 5.00
      },
      dias_cobertura_estimados: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      activo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 8. TERCEROS (CLIENTES Y PROVEEDORES)
    // -------------------------------------------------------------
    await queryInterface.createTable('Terceros', {
      id_tercero: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tipo_tercero: {
        type: Sequelize.STRING(20),
        allowNull: false // CLIENTE / PROVEEDOR
      },
      identificacion: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      nombre_legal: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      actividad_hacienda: {
        type: Sequelize.STRING(100)
      },
      estado_tributario: {
        type: Sequelize.STRING(50),
        defaultValue: 'INSCRITO'
      },
      correo: {
        type: Sequelize.STRING(150)
      },
      telefono: {
        type: Sequelize.STRING(30)
      },
      validado_hacienda: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      ultima_consulta_atv: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 9. GASTOS Y MOVIMIENTOS DE INVENTARIO
    // -------------------------------------------------------------
    await queryInterface.createTable('GastosOperativos', {
      id_gasto: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_categoria: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CategoriasOperativas', key: 'id_categoria' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_proveedor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Terceros', key: 'id_tercero' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      descripcion: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      monto: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      moneda: {
        type: Sequelize.STRING(10),
        defaultValue: 'CRC'
      },
      fecha_gasto: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      es_recurrente: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      estado_reconciliacion: {
        type: Sequelize.STRING(30),
        defaultValue: 'PENDIENTE'
      },
      url_respaldo_archivo: {
        type: Sequelize.STRING(255)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('MovimientosInventario', {
      id_movimiento: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_item: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ItemsCatalogo', key: 'id_item' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      tipo_movimiento: {
        type: Sequelize.STRING(20),
        allowNull: false // ENTRADA / SALIDA / AJUSTE
      },
      cantidad: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      stock_anterior: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      stock_resultante: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      costo_unitario_historico: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      motivo_auditoria: {
        type: Sequelize.STRING(255)
      },
      fecha_movimiento: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 10. VENTAS Y DETALLE DE VENTAS (POS BIMONEDA)
    // -------------------------------------------------------------
    await queryInterface.createTable('Ventas', {
      id_venta: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_cliente: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Terceros', key: 'id_tercero' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      numero_comprobante: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      turno_caja: {
        type: Sequelize.STRING(30)
      },
      fecha_venta: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      moneda: {
        type: Sequelize.STRING(10),
        defaultValue: 'CRC' // CRC / USD
      },
      tipo_cambio_aplicado: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 1.0000
      },
      subtotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      descuento_aplicado_pct: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.00
      },
      impuestos: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      total_venta: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      costo_total_operativo: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      margen_neto_calculado: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      porcentaje_margen: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.00
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('DetalleVentas', {
      id_detalle_venta: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_venta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Ventas', key: 'id_venta' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_item: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ItemsCatalogo', key: 'id_item' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      cantidad: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      precio_unitario: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      costo_unitario_momento: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      subtotal_linea: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      margen_linea: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 11. COMPRAS A PROVEEDORES Y DETALLE
    // -------------------------------------------------------------
    await queryInterface.createTable('ComprasProveedores', {
      id_compra: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_proveedor: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Terceros', key: 'id_tercero' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      numero_factura: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      clave_numerica_hacienda: {
        type: Sequelize.STRING(50)
      },
      fecha_emision: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      moneda: {
        type: Sequelize.STRING(10),
        defaultValue: 'CRC' // CRC / USD
      },
      tipo_cambio_aplicado: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 1.0000
      },
      subtotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      impuestos: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      total_compra: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      origen_registro: {
        type: Sequelize.STRING(20),
        defaultValue: 'MANUAL' // XML_IA / MANUAL
      },
      url_respaldo_archivo: {
        type: Sequelize.STRING(255)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('DetalleCompras', {
      id_detalle_compra: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_compra: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ComprasProveedores', key: 'id_compra' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_item: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ItemsCatalogo', key: 'id_item' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      cantidad: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      costo_unitario_compra: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      subtotal_linea: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // 12. MOTOR DE IA (8 AGENTES) Y ALERTAS / FUGAS
    // -------------------------------------------------------------
    await queryInterface.createTable('BitacoraAgentesIa', {
      id_ejecucion: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      numero_agente: {
        type: Sequelize.INTEGER,
        allowNull: false // 1..8
      },
      nombre_agente: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      proveedor_modelo: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      resumen_entrada: {
        type: Sequelize.TEXT
      },
      resumen_salida: {
        type: Sequelize.TEXT
      },
      tokens_consumidos: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      estado_ejecucion: {
        type: Sequelize.STRING(20),
        defaultValue: 'EXITOSA'
      },
      ejecutada_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.createTable('AlertasAnomalias', {
      id_alerta: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Empresas', key: 'id_empresa' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_item: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ItemsCatalogo', key: 'id_item' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_gasto: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'GastosOperativos', key: 'id_gasto' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_venta: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Ventas', key: 'id_venta' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_ejecucion_ia: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'BitacoraAgentesIa', key: 'id_ejecucion' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tipo_alerta: {
        type: Sequelize.STRING(30),
        allowNull: false // FUGA / MARGEN / RUNWAY
      },
      severidad: {
        type: Sequelize.STRING(20),
        allowNull: false // BAJA / MEDIA / ALTA / CRITICA
      },
      impacto_economico_estimado: {
        type: Sequelize.DECIMAL(14, 2),
        defaultValue: 0.00
      },
      diagnostico_detalle: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(20),
        defaultValue: 'PENDIENTE' // PENDIENTE / EN_REVISION / RESUELTA / DESCARTADA
      },
      resuelta_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      justificacion_cierre: {
        type: Sequelize.TEXT
      },
      creada_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      resuelta_en: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // -------------------------------------------------------------
    // ÍNDICES PARA ALTO RENDIMIENTO Y BÚSQUEDAS MULTI-TENANT
    // -------------------------------------------------------------
    await queryInterface.addIndex('Empresas', ['cedula_juridica']);
    await queryInterface.addIndex('IndicadoresEconomicos', ['id_empresa', 'fecha_referencia']);
    await queryInterface.addIndex('PoliticasMargenCabys', ['id_empresa', 'codigo_cabys_familia']);
    await queryInterface.addIndex('ItemsCatalogo', ['id_empresa', 'sku']);
    await queryInterface.addIndex('Terceros', ['id_empresa', 'identificacion']);
    await queryInterface.addIndex('Ventas', ['id_empresa', 'fecha_venta']);
    await queryInterface.addIndex('ComprasProveedores', ['id_empresa', 'fecha_emision']);
    await queryInterface.addIndex('AlertasAnomalias', ['id_empresa', 'estado', 'severidad']);
    await queryInterface.addIndex('BitacoraAgentesIa', ['id_empresa', 'numero_agente']);
  },

  async down(queryInterface) {
    // Eliminar en orden inverso a las llaves foráneas
    await queryInterface.dropTable('AlertasAnomalias');
    await queryInterface.dropTable('BitacoraAgentesIa');
    await queryInterface.dropTable('DetalleCompras');
    await queryInterface.dropTable('ComprasProveedores');
    await queryInterface.dropTable('DetalleVentas');
    await queryInterface.dropTable('Ventas');
    await queryInterface.dropTable('MovimientosInventario');
    await queryInterface.dropTable('GastosOperativos');
    await queryInterface.dropTable('Terceros');
    await queryInterface.dropTable('ItemsCatalogo');
    await queryInterface.dropTable('CategoriasOperativas');
    await queryInterface.dropTable('BitacoraAuditoriaAccesos');
    await queryInterface.dropTable('SolicitudesEliminacionDatos');
    await queryInterface.dropTable('ConsentimientosLegales');
    await queryInterface.dropTable('PoliticasMargenCabys');
    await queryInterface.dropTable('IndicadoresEconomicos');
    await queryInterface.dropTable('UsuariosRoles');
    await queryInterface.dropTable('Roles');
    await queryInterface.dropTable('Empresas');
  }
};
