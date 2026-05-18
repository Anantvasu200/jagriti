'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Note: PostGIS extension should be enabled by sequelize config before running this.
    await queryInterface.createTable('incidents', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      type: {
        type: Sequelize.ENUM('theft', 'harassment', 'assault', 'suspicious', 'other'),
        allowNull: false
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      city: {
        type: Sequelize.STRING
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    // Add SPATIAL index on location
    await queryInterface.sequelize.query(`
      CREATE INDEX incidents_location_idx
      ON incidents
      USING GIST (location);
    `);

    // Add constraint to ensure points are within India bounds approx
    // India roughly: lat 6 to 38, lon 68 to 98
    await queryInterface.sequelize.query(`
      ALTER TABLE incidents
      ADD CONSTRAINT incidents_india_bounds_check
      CHECK (
        ST_X(location) >= 68 AND ST_X(location) <= 98 AND
        ST_Y(location) >= 6 AND ST_Y(location) <= 38
      );
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS incidents_location_idx;`);
    await queryInterface.dropTable('incidents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_incidents_type";');
  }
};
