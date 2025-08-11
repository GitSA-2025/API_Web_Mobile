const { Sequelize } = require('sequelize');
const { DeliveryRegister } = require('./deliveryRegister');
const { NotaFiscal } = require('./notaFiscal');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
});

DeliveryRegister.hasMany(NotaFiscal);
NotaFiscal.belongsTo(DeliveryRegister);

module.exports = { sequelize, DeliveryRegister, NotaFiscal };