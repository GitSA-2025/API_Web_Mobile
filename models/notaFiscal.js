const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const NotaFiscal = sequelize.define('NotaFiscal', {
    idNota: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    numero: {type: DataTypes.STRING, allowNull: false, }
});

module.exports = NotaFiscal;