const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const UserAPP = sequelize.define('UserAPP', {
    nome: {type: DataTypes.STRING, allowNull: false },
    email: {type: DataTypes.STRING, allowNull: false, unique: true },
    telefone: {type: DataTypes.STRING, allowNull: false },
    senha: {type: DataTypes.STRING, allowNull: false },
    codigo2FA: {type: DataTypes.STRING },
    verificado2FA: {type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = UserAPP;