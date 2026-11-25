'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize');
const config = require('../config/config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config);
const db = {};

fs.readdirSync(__dirname)
  .filter((archivo) =>
    archivo.indexOf('.') !== 0 &&
    archivo !== path.basename(__filename) &&
    archivo.slice(-3) === '.js' &&
    archivo.indexOf('.test.js') === -1
  )
  .forEach((archivo) => {
    const modelo = require(path.join(__dirname, archivo))(sequelize, Sequelize.DataTypes);
    db[modelo.name] = modelo;
  });

Object.keys(db).forEach((nombreModelo) => {
  if (db[nombreModelo].associate) {
    db[nombreModelo].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
