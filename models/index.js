const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const DeliveryRegister = require('./deliveryRegister')(sequelize, DataTypes);
const NotaFiscal = require('./notaFiscal')(sequelize, DataTypes);

DeliveryRegister.hasMany(NotaFiscal);
NotaFiscal.belongsTo(DeliveryRegister);

module.exports = { sequelize, DeliveryRegister, NotaFiscal };
