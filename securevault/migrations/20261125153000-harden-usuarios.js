'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Usuarios', 'datoSensibleMascara', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: '***-***-****'
    });

    await queryInterface.addColumn('Usuarios', 'sesionVersion', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addIndex('Usuarios', ['email'], {
      name: 'usuarios_email_unique',
      unique: true
    });

    await queryInterface.addIndex('EventosSeguridad', ['createdAt'], {
      name: 'eventos_createdat_idx'
    });

    await queryInterface.addIndex('EventosSeguridad', ['tipoEvento'], {
      name: 'eventos_tipoevento_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('EventosSeguridad', 'eventos_tipoevento_idx');
    await queryInterface.removeIndex('EventosSeguridad', 'eventos_createdat_idx');
    await queryInterface.removeIndex('Usuarios', 'usuarios_email_unique');
    await queryInterface.removeColumn('Usuarios', 'sesionVersion');
    await queryInterface.removeColumn('Usuarios', 'datoSensibleMascara');
  }
};
