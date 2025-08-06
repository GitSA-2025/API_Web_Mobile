const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const QRCodeEntry = sequelize.define('QRCodeEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  usado: { type: DataTypes.BOOLEAN, defaultValue: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
});

module.exports = QRCodeEntry;
