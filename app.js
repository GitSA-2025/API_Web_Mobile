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

console.log("EMAIL:", process.env.EMAIL_USER);
console.log("SENHA:", process.env.EMAIL_PASS ? "OK" : "VAZIA");
