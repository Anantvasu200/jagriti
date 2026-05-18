const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IncidentSource = sequelize.define('IncidentSource', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    incidentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'incidents',
        key: 'id'
      }
    },
    sourceName: {
      type: DataTypes.STRING, // e.g., 'TOI', 'NDTV', 'NCRB'
      allowNull: false
    },
    sourceUrl: {
      type: DataTypes.STRING
    },
    reliabilityScore: {
      type: DataTypes.FLOAT, // 0 to 1
      defaultValue: 0.5
    }
  }, {
    tableName: 'incident_sources',
    timestamps: true
  });

  return IncidentSource;
};
