const { sequelize } = require('../config/sequelize');

const Incident = require('./Incident')(sequelize);
const IncidentSource = require('./IncidentSource')(sequelize);
const CommunityReport = require('./CommunityReport')(sequelize);
const SafetyScore = require('./SafetyScore')(sequelize);
const ApiKey = require('./ApiKey')(sequelize);
const User = require('./User')(sequelize);

// Associations
Incident.hasMany(IncidentSource, { foreignKey: 'incidentId', as: 'sources' });
IncidentSource.belongsTo(Incident, { foreignKey: 'incidentId', as: 'incident' });

Incident.hasMany(CommunityReport, { foreignKey: 'incidentId', as: 'communityReports' });
CommunityReport.belongsTo(Incident, { foreignKey: 'incidentId', as: 'incident' });

module.exports = {
  sequelize,
  Incident,
  IncidentSource,
  CommunityReport,
  SafetyScore,
  ApiKey,
  User
};
