require('dotenv').config();

const express = require('express');
const dotenv = require('dotenv');
const { sequelize } = require('./models/index');
const authRoutes = require ('./routes/authRoutes');
const appRoutes = require ('./routes/appRoutes');
const cors = require('cors');

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/mobile', appRoutes);
app.use('/qrcodes', express.static('public/qrcodes'));

sequelize.sync().then(() => {
    app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
});

console.log("EMAIL:", process.env.MAIL_USER);
console.log("SENHA:", process.env.MAIL_PASS ? "OK" : "VAZIA");
