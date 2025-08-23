const { DataTypes } = require('sequelize');
const sequelize = require('./index'); 

const AccessRegister = sequelize.define('AccessRegister', {
    idRegister: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('colaborador', 'visitante'),
        allowNull: false
    },
    data: {
        type: DataTypes.DATEONLY, 
        allowNull: false
    },
    hrentrada: {
        type: DataTypes.TIME, 
        allowNull: false
    },
    hrsaida: {
        type: DataTypes.TIME,
        allowNull: false
    },
    placa: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    freezeTableName: true, 
    timestamps: false      
});

module.exports = AccessRegister;
