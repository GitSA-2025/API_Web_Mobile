const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const User = sequelize.define('User', {
    nome: {type: DataTypes.STRING, allowNull: false },
    cpf: {type: DataTypes.STRING, allowNull: false, unique: true },
    email: {type: DataTypes.STRING, allowNull: false, unique: true },
    telefone: {type: DataTypes.STRING, allowNull: false },
    senha: {type: DataTypes.STRING, allowNull: false },
    tipo: {type: DataTypes.ENUM('colaborador', 'visitante'), allowNull: false },
    codigo2FA: {type: DataTypes.STRING },
    verificado2FA: {type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = User;