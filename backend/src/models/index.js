const { sequelize } = require('../config/sequelize');

const Incident = require('./Incident')(sequelize);
const IncidentSource = require('./IncidentSource')(sequelize);
const CommunityReport = require('./CommunityReport')(sequelize);
const SafetyScore = require('./SafetyScore')(sequelize);
const ApiKey = require('./ApiKey')(sequelize);
const User = require('./User')(sequelize);
const SubLocality = require('./SubLocality')(sequelize);
const Route = require('./Route')(sequelize);
const RouteSegment = require('./RouteSegment')(sequelize);

// Associations
Incident.hasMany(IncidentSource, { foreignKey: 'incidentId', as: 'sources' });
IncidentSource.belongsTo(Incident, { foreignKey: 'incidentId', as: 'incident' });

Incident.hasMany(CommunityReport, { foreignKey: 'incidentId', as: 'communityReports' });
CommunityReport.belongsTo(Incident, { foreignKey: 'incidentId', as: 'incident' });

Route.hasMany(RouteSegment, { foreignKey: 'route_id', as: 'segments', onDelete: 'CASCADE' });
RouteSegment.belongsTo(Route, { foreignKey: 'route_id', as: 'route' });

module.exports = {
  sequelize,
  Incident,
  IncidentSource,
  CommunityReport,
  SafetyScore,
  ApiKey,
  User,
  SubLocality,
  Route,
  RouteSegment
};
