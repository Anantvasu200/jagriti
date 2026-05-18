const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Incident = sequelize.define('Incident', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    type: {
      type: DataTypes.ENUM('theft', 'harassment', 'assault', 'suspicious', 'other'),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    source: {
      type: DataTypes.ENUM('nlp', 'ncrb', 'community'),
      defaultValue: 'nlp'
    },
    confirmations: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'incidents',
    timestamps: true,
    indexes: [
      {
        type: 'SPATIAL',
        fields: ['location']
      }
    ]
  });

  return Incident;
};
