const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubLocality = sequelize.define('SubLocality', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    geom: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    },
    admin_level: {
      type: DataTypes.INTEGER
    },
    bounds: {
      type: DataTypes.JSONB
    }
  }, {
    tableName: 'sub_localities',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'city']
      },
      {
        type: 'SPATIAL',
        fields: ['geom']
      },
      {
        fields: ['city']
      }
    ]
  });

  return SubLocality;
};
