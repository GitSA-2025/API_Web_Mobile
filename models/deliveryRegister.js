module.exports = (sequelize, DataTypes) => {
  return sequelize.define('DeliveryRegister', {
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
    telefone: {
      type: DataTypes.STRING,
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
    placa: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    freezeTableName: true,
    timestamps: false
  });
};
