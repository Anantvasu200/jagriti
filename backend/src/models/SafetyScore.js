const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SafetyScore = sequelize.define('SafetyScore', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    areaName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    score: {
      type: DataTypes.FLOAT, // 1 to 10
      allowNull: false
    },
    lastCalculatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'safety_scores',
    timestamps: true,
    indexes: [
      {
        type: 'SPATIAL',
        fields: ['location']
      }
    ]
  });

  return SafetyScore;
};
