const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const AccessRegister = sequelize.define('AccessRegister', {
    nome: {type: DataTypes.STRING, allowNull: false },
    cpf: {type: DataTypes.STRING, allowNull: false },
    tipo: {type: DataTypes.ENUM('colaborador', 'visitante'), allowNull: false },
    data: {type: DataTypes.DATE, allowNull: false},
    hrentrada: {type: DataTypes.STRING, allowNull: false}
});

module.exports = AccessRegister;