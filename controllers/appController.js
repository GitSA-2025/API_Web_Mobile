require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserAPP = require('../models/userApp');
const DeliveryRegister = require('../models/deliveryRegister');
const AccessRegister = require('../models/accessRegister');
const { generate2FACode } = require('../utils/generate2FACode');
const { send2FACode, transporter } = require('../services/mailService');


async function cadastrarAPP(req, res) {
    try {
        const { nome, email, telefone, senha } = req.body;
        const senhaHash = await bcrypt.hash(senha, 10);
        const codigo2FA = generate2FACode();

        const user = await UserAPP.create({
            nome,
            email,
            telefone,
            senha: senhaHash,
            codigo2FA
        });

        await send2FACode(email, codigo2FA);
        res.status(201).json({ message: 'Usuário cadastrado! Verifique o código enviado por e-mail.' });
    }
    catch (err) {
        console.error('Erro no cadastro:', err);
        res.status(500).json({ error: 'Erro ao cadastrar usuário. Detalhes no terminal.' });
    }
}

async function verificar2FAAPP(req, res) {
  const { email, codigo } = req.body;
  const user = await UserAPP.findOne({ where: { email } });
  if (!user || user.codigo2FA !== codigo) return res.status(400).json({ error: 'Código inválido.' });

  user.verificado2FA = true;
  await user.save();
  res.json({ message: '2FA verificado com sucesso!' });
}

async function loginAPP(req, res) {
  const { email, senha } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(senha, user.senha))) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (!user.verificado2FA) return res.status(403).json({ error: '2FA não verificado' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
}

async function editarContaAPP(req, res) {
    const { nome, email, telefone } = req.body;
    try {
        const user = await UserAPP.findByPk(req.userId);
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    user.nome = nome;
    user.telefone = telefone.replace(/\D/g, '');
    user.email = email;
    await user.save();
    res.json({ message: "Perfil atualizado com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
}

async function criarRegistroEntrega(req, res) {
  try{
    const { nome, data, telefone, hrentrada, placa } = req.body;

    const deliveryRegister = await DeliveryRegister.create({
      nome,
      telefone,
      data,
      hrentrada,
      placa
    });
  }
  catch (err) {
    console.error('Erro no registro de entrega:', err);
    res.status(500).json({ error: 'Erro ao registrar a entrega. Detalhes no terminal.'});
  }
}

async function criarRegistroEntrada(req, res){
  try{
    const { nome, tipo, cpf, placa } = req.body;

    if(!nome || !tipo || !cpf){
      return res.status(400).json({ error: 'Nome, tipo de pessoa e CPF estão em branco. Preencha os campos corretamente.'});
    }

    const verifPlaca = "";

    if(placa == "" || !placa){
      verifPlaca = "Não se aplica.";
    }
    else {
      verifPlaca = placa;
    }

    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)){
      return res.status(400).json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.'});
    }

    const cpfHast = await bcrypt.hash(cpf, 10);

    const agora = new Date();
    const data = agora.toISOString().split('T')[0];
    const hrentrada = agora.toTimeString().split('')[0];

    const registro = await AccessRegister.create({
      nome: nome,
      cpf: cpfHast,
      tipo: tipo,
      data: data,
      hrentrada: hrentrada,
      hrsaida: '-',
      placa: verifPlaca,
    });

    res.status(201).json({ msg: 'Entrada registrada com sucesso!', registro: {
      id: registro.id,
      nome: registro.nome,
      tipo: registro.tipo,
      data: registro.data,
      placa: registro.placa,
    }})
  }
  catch(err){
    console.error('Erro ao registro entrada: ', err)
    res.status(500).json({error: 'Erro ao registrar entrada.'});
  }
}

async function exbirRegistrosEntrega(req, res) {
  try{
    const entregas = await DeliveryRegister.findAll({
      order: [['data', 'DESC'], ['hrentrada', 'DESC']]
    });

    res.status(200).json(entregas);
  }
  catch(err){
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({error: 'Erro ao listar entregas.'});
  }
}

async function exbirRegistrosEntrada(req, res) {
  try{
    const entregas = await AccessRegister.findAll({
      order: [['data', 'DESC'], ['hrentrada', 'DESC']]
    });

    res.status(200).json(entregas);
  }
  catch(err){
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({error: 'Erro ao listar entregas.'});
  }
}

async function verContaAPP(req, res) {
  const user = await User.findByPk(req.userId);
  res.json(user);
}

module.exports = {
  cadastrarAPP,
  loginAPP,
  verificar2FAAPP,
  editarContaAPP,
  criarRegistroEntrega,
  criarRegistroEntrada,
  exbirRegistrosEntrega,
  exbirRegistrosEntrada,
  verContaAPP,
};