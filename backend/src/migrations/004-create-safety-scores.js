'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('safety_scores', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      areaName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      lastCalculatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
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

    await queryInterface.sequelize.query(`
      CREATE INDEX safety_scores_location_idx
      ON safety_scores
      USING GIST (location);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS safety_scores_location_idx;`);
    await queryInterface.dropTable('safety_scores');
  }
};
