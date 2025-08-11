const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const DeliveryRegister = sequelize.define('DeliveryRegister', {
    idRegister: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    nome: {type: DataTypes.STRING, allowNull: false },
    data: {type: DataTypes.DATE, allowNull: false},
    hrentrada: {type: DataTypes.TIME, allowNull: false},
    placa: {type: DataTypes.STRING, allowNull: true},
});

module.exports = DeliveryRegister;