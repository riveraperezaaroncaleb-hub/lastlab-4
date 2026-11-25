'use strict';

const { z, ZodError } = require('zod');
const db = require('../models');
const { Usuario, EventoSeguridad } = db;

const cambioRolSchema = z.object({
  rol: z.enum(['usuario', 'administrador'], {
    errorMap: () => ({ message: 'El rol debe ser estrictamente "usuario" o "administrador".' })
  })
}).strict();

const LIMITE_MAXIMO = 100;

function parsearId(valor) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsearLimite(valor) {
  const limite = Number(valor);
  return Number.isSafeInteger(limite) && limite > 0 ? Math.min(limite, LIMITE_MAXIMO) : LIMITE_MAXIMO;
}

function responderValidacion(res, error) {
  return res.status(400).json({
    error: 'Datos de entrada inválidos',
    detalles: error.issues.map((issue) => ({
      campo: issue.path.join('.') || 'cuerpo',
      mensaje: issue.message
    }))
  });
}

async function listarUsuariosAdmin(_req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'email', 'rol', 'datoSensibleMascara', 'createdAt', 'updatedAt'],
      order: [['id', 'ASC']],
      limit: LIMITE_MAXIMO
    });

    return res.status(200).json(usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      datoSensible: usuario.datoSensibleMascara || '***-***-****',
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt
    })));
  } catch (error) {
    return next(error);
  }
}

async function actualizarRolUsuario(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Identificador de usuario inválido.' });
    }

    const { rol: nuevoRol } = cambioRolSchema.parse(req.body);

    if (id === req.user.id) {
      return res.status(403).json({ error: 'No puede modificar su propio rol.' });
    }

    const transaccion = await db.sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(id, { transaction: transaccion });
      if (!usuario) {
        await transaccion.rollback();
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const rolAnterior = usuario.rol;
      if (rolAnterior === 'administrador' && nuevoRol !== 'administrador') {
        const totalAdministradores = await Usuario.count({
          where: { rol: 'administrador' },
          transaction: transaccion
        });
        if (totalAdministradores <= 1) {
          await transaccion.rollback();
          return res.status(409).json({
            error: 'No se puede degradar al último administrador del sistema.'
          });
        }
      }

      usuario.rol = nuevoRol;
      usuario.sesionVersion = (usuario.sesionVersion ?? 0) + 1;
      await usuario.save({ transaction: transaccion });
      await transaccion.commit();

      await EventoSeguridad.registrar({
        tipoEvento: 'CAMBIO_ROL',
        usuarioId: usuario.id,
        ip: req.ip,
        detalle: `Rol cambiado de "${rolAnterior}" a "${nuevoRol}" por administrador ID ${req.user.id}`
      });

      return res.status(200).json({
        mensaje: 'Rol actualizado exitosamente.',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        }
      });
    } catch (error) {
      await transaccion.rollback();
      throw error;
    }
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    return next(error);
  }
}

async function obtenerBitacora(req, res, next) {
  try {
    const eventos = await EventoSeguridad.findAll({
      order: [['createdAt', 'DESC']],
      limit: parsearLimite(req.query.limit)
    });

    return res.status(200).json(eventos);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarUsuariosAdmin,
  actualizarRolUsuario,
  obtenerBitacora
};
