const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Route = sequelize.define('Route', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    start_point: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    },
    end_point: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    },
    total_distance: {
      type: DataTypes.FLOAT
    },
    total_duration: {
      type: DataTypes.FLOAT
    },
    overall_safety_score: {
      type: DataTypes.FLOAT
    },
    polyline_encoded: {
      type: DataTypes.TEXT
    },
    has_tolls: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nearby_facilities: {
      type: DataTypes.JSONB
    }
  }, {
    tableName: 'routes',
    timestamps: true
  });

  return Route;
};
