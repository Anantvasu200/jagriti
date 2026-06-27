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
    },
    confidence_score: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0
    },
    title_hi: {
      type: DataTypes.STRING
    },
    description_hi: {
      type: DataTypes.TEXT
    },
    sub_locality: {
      type: DataTypes.STRING
    },
    location_confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 0.8
    },
    is_kalman_filtered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    kalman_state: {
      type: DataTypes.JSONB
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
