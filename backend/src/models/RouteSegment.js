const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RouteSegment = sequelize.define('RouteSegment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    route_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    segment_index: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    geom: {
      type: DataTypes.GEOMETRY('LINESTRING', 4326),
      allowNull: false
    },
    safety_score: {
      type: DataTypes.FLOAT
    },
    color_code: {
      type: DataTypes.STRING
    },
    incidents_nearby: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'route_segments',
    timestamps: true,
    indexes: [
      {
        fields: ['route_id']
      },
      {
        type: 'SPATIAL',
        fields: ['geom']
      }
    ]
  });

  return RouteSegment;
};
