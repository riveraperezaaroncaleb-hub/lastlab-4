'use strict';

const { z, ZodError } = require('zod');
const { Nota } = require('../models');
const { encryptField, decryptField } = require('../utils/crypto');

const crearNotaSchema = z.object({
  titulo: z.string({ required_error: 'El título es obligatorio' })
    .trim()
    .min(1, 'El título no puede estar vacío')
    .max(120, 'El título no puede exceder 120 caracteres'),
  contenido: z.string({ required_error: 'El contenido es obligatorio' })
    .min(1, 'El contenido no puede estar vacío')
    .max(5000, 'El contenido no puede exceder 5000 caracteres')
}).strict();

const actualizarNotaSchema = z.object({
  titulo: z.string()
    .trim()
    .min(1, 'El título no puede estar vacío')
    .max(120, 'El título no puede exceder 120 caracteres')
    .optional(),
  contenido: z.string()
    .min(1, 'El contenido no puede estar vacío')
    .max(5000, 'El contenido no puede exceder 5000 caracteres')
    .optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Debe proporcionar al menos un campo para actualizar (título o contenido).'
});

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

function notaPublica(nota) {
  return {
    id: nota.id,
    titulo: nota.titulo,
    contenido: decryptField(nota.contenidoCifrado),
    usuarioId: nota.usuarioId,
    createdAt: nota.createdAt,
    updatedAt: nota.updatedAt
  };
}

async function crearNota(req, res, next) {
  try {
    const datos = crearNotaSchema.parse(req.body);
    const nota = await Nota.create({
      titulo: datos.titulo,
      contenidoCifrado: encryptField(datos.contenido),
      usuarioId: req.user.id
    });

    return res.status(201).json(notaPublica(nota));
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    return next(error);
  }
}

async function listarNotas(req, res, next) {
  try {
    const notas = await Nota.findAll({
      where: { usuarioId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: parsearLimite(req.query.limit)
    });

    return res.status(200).json(notas.map(notaPublica));
  } catch (error) {
    return next(error);
  }
}

async function notaDelUsuario(req, id) {
  return Nota.findOne({ where: { id, usuarioId: req.user.id } });
}

async function obtenerNotaPorId(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Identificador de nota no válido.' });
    }

    const nota = await notaDelUsuario(req, id);
    if (!nota) {
      return res.status(404).json({ error: 'Nota no encontrada.' });
    }

    return res.status(200).json(notaPublica(nota));
  } catch (error) {
    return next(error);
  }
}

async function actualizarNota(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Identificador de nota no válido.' });
    }

    const datos = actualizarNotaSchema.parse(req.body);
    const nota = await notaDelUsuario(req, id);
    if (!nota) {
      return res.status(404).json({ error: 'Nota no encontrada.' });
    }

    if (datos.titulo !== undefined) nota.titulo = datos.titulo;
    if (datos.contenido !== undefined) {
      nota.contenidoCifrado = encryptField(datos.contenido);
    }

    await nota.save();
    return res.status(200).json(notaPublica(nota));
  } catch (error) {
    if (error instanceof ZodError) return responderValidacion(res, error);
    return next(error);
  }
}

async function eliminarNota(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Identificador de nota no válido.' });
    }

    const nota = await notaDelUsuario(req, id);
    if (!nota) {
      return res.status(404).json({ error: 'Nota no encontrada.' });
    }

    await nota.destroy();
    return res.status(200).json({ mensaje: 'Nota eliminada exitosamente.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  crearNota,
  listarNotas,
  obtenerNotaPorId,
  actualizarNota,
  eliminarNota
};
