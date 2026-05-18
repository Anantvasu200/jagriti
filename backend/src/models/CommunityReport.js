const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityReport = sequelize.define('CommunityReport', {
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
    reportDetails: {
      type: DataTypes.TEXT
    },
    userId: {
      type: DataTypes.STRING, // Could be anonymous session ID or actual user ID
      allowNull: false
    }
  }, {
    tableName: 'community_reports',
    timestamps: true
  });

  return CommunityReport;
};
