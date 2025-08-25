module.exports = (sequelize, DataTypes) => {
    return sequelize.define('NotaFiscal', {
        idNota: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
        numero: { type: DataTypes.STRING, allowNull: false, }
    });
}

