'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('incident_sources', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      incidentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'incidents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sourceName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sourceUrl: {
        type: Sequelize.STRING
      },
      reliabilityScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0.5
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('incident_sources');
  }
};
