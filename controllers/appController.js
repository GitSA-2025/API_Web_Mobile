require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserAPP = require('../models/userApp');
const { DeliveryRegister } = require('../models');
const AccessRegister = require('../models/accessRegister');
const { generate2FACode } = require('../utils/generate2FACode');
const { send2FACode, transporter } = require('../services/mailService');
const sql = require('../db/db');

/*async function cadastrarAPP(req, res) {
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
}*/

async function cadastrarAPP(req, res) {
  try {
    const { nome, email, telefone, senha } = req.body;
    const senhaHash = await bcrypt.hash(senha, 10);
    const codigo2FA = generate2FACode();

    const result = await sql`
      INSERT INTO userapp (name, user_email, phone, user_password, code2fa)
      VALUES (${nome}, ${email}, ${telefone}, ${senhaHash}, ${codigo2FA})
      RETURNING *
    `;

    await send2FACode(email, codigo2FA);

    res.status(201).json({
      message: 'Usuário cadastrado! Verifique o código enviado por e-mail.',
      usuario: result[0], 
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário. Detalhes no terminal.' });
  }
}


/*async function verificar2FAAPP(req, res) {
  const { email, codigo } = req.body;
  const user = await UserAPP.findOne({ where: { email } });
  if (!user || user.codigo2FA !== codigo) return res.status(400).json({ error: 'Código inválido.' });

  user.verificado2FA = true;
  await user.save();
  res.json({ message: '2FA verificado com sucesso!' });
}*/

async function verificar2FAAPP(req, res) {
  const { email, codigo } = req.body;
  const result = await pool.query(
    "SELECT * userapp WHERE email = $1",
    [email]);

  const user = result.rows[0];
  
  if(!user || user.code2fa !== codigo) return
  res.status(400).json({ error: 'Código inválido.'});

 const env = await pool.query(
    "UPDATE userweb SET verify2fa = 'true' WHERE id_user = $1",
    [user.id_user]
  );

  res.json(result.rows[0], env.rows[0]);

  res.json({ message: '2FA verificado com sucesso!' });
}

/*async function loginAPP(req, res) {
  const { email, senha } = req.body;
  const user = await UserAPP.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(senha, user.senha))) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (!user.verificado2FA) return res.status(403).json({ error: '2FA não verificado' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
}*/

async function loginAPP(req, res) {
  const { email, senha } = req.body;

  const result = pool.query(
    "SELECT * from userapp WHERE email = $1",
    [email]
  );

  const user = result.rows[0];

  if(!user || !(await bcrypt.compare(senha, user.user_password))) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!user.verify2fa) return res.status(403).json({ error: '2FA não verificado' });
  
    const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
  try {
    const { nome, telefone, placa, industria } = req.body;

    const agora = new Date();
    const data = agora.toISOString().split('T')[0];
    const hrentrada = agora.toTimeString().split(' ')[0];

    const deliveryRegister = await DeliveryRegister.create({
      nome,
      telefone,
      data,
      hrentrada,
      placa,
      industria
    });


    res.status(201).json({ message: 'Entrega registrada com sucesso.', deliveryRegister });
  } catch (err) {
    console.error('Erro no registro de entrega:', err);
    res.status(500).json({ error: 'Erro ao registrar a entrega. Detalhes no terminal.' });
  }
}


async function criarRegistroEntrada(req, res) {
  try {
    const { nome, tipo, cpf, placa } = req.body;

    if (!nome || !tipo || !cpf) {
      return res.status(400).json({ error: 'Nome, tipo de pessoa e CPF estão em branco. Preencha os campos corretamente.' });
    }

    const verifPlaca = placa && placa.trim() !== '' ? placa.trim() : 'Não se aplica.';

    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
      return res.status(400).json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.' });
    }

    const cpfHast = await bcrypt.hash(cpf, 10);

    const agora = new Date();
    const data = agora.toISOString().split('T')[0];
    const hrentrada = agora.toTimeString().split(' ')[0];

    const registro = await AccessRegister.create({
      nome: nome,
      cpf: cpfHast,
      tipo: tipo,
      data: data,
      hrentrada: hrentrada,
      hrsaida: '-',
      placa: verifPlaca,
    });

    res.status(201).json({
      msg: 'Entrada registrada com sucesso!', registro: {
        id: registro.idRegister,
        nome: registro.nome,
        tipo: registro.tipo,
        data: registro.data,
        placa: registro.placa,
      }
    })
  }
  catch (err) {
    console.error('Erro ao registro entrada: ', err)
    res.status(500).json({ error: 'Erro ao registrar entrada.' });
  }
}

async function exbirRegistrosEntrega(req, res) {
  try {
    const entregas = await DeliveryRegister.findAll({
      order: [['data', 'ASC'], ['hrentrada', 'ASC']]
    });

    res.status(200).json(entregas);
  }
  catch (err) {
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({ error: 'Erro ao listar entregas.' });
  }
}

async function exbirRegistrosEntrada(req, res) {
  try {
    const entregas = await AccessRegister.findAll({
      order: [['data', 'DESC'], ['hrentrada', 'DESC']]
    });

    res.status(200).json(entregas);
  }
  catch (err) {
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({ error: 'Erro ao listar entregas.' });
  }
}

async function verContaAPP(req, res) {
  try {
    const user = await UserAPP.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function editarRegistroEntrada(req, res) {
  const { nome, tipo, cpf, placa } = req.body;
  const idRegister = req.params.idRegister;
  try {
    const registro = await AccessRegister.findByPk(idRegister);
    if (!registro) return res.status(404).json({ error: "Registro de entrada não encontrado." });

    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
      return res.status(400).json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.' });
    }

    const cpfHast = await bcrypt.hash(cpf, 10);

    const verifPlaca = placa && placa.trim() !== '' ? placa.trim() : 'Não se aplica.';

    const agora = new Date();
    const hrsaida = agora.toTimeString().split(' ')[0];

    registro.nome = nome;
    registro.tipo = tipo;
    registro.cpf = cpfHast;
    registro.placa = verifPlaca;
    registro.hrsaida = hrsaida;
    await registro.save();
    res.json({ message: "Registro de entrada atualizado com sucesso." });
  }
  catch (err) {
    res.status(500).json({ error: "Erro ao atualizar o registro." });
    console.log(err);
  }
}

async function editarRegistroEntrega(req, res) {
  const { nome, telefone, placa } = req.body;
  const idRegister = req.params.idRegister;
  try {
    const registro = await DeliveryRegister.findByPk(idRegister);
    if (!registro) return res.status(404).json({ error: "Registro de entrada não encontrado." });


    registro.nome = nome;
    registro.telefone = telefone;
    registro.placa = placa;
    await registro.save();
    res.json({ message: "Registro de entrada atualizado com sucesso." });
  }
  catch (err) {
    res.status(500).json({ error: "Erro ao atualizar o registro." });
    console.log(err);
  }
}

async function exibirRegistroEntradaPorID(req, res) {
  try {
    const { idRegister } = req.params;

    const registro = await AccessRegister.findByPk(idRegister);

    if (!registro) {
      return res.status(404).json({ error: "Registro de entrada não encontrado." });
    }

    res.status(200).json({
      idRegister: registro.idRegister,
      nome: registro.nome,
      tipo: registro.tipo,
      data: registro.data,
      hrentrada: registro.hrentrada,
      hrsaida: registro.hrsaida,
      placa: registro.placa
    });
  } catch (err) {
    console.error("Erro ao buscar registro de entrada:", err);
    res.status(500).json({ error: "Erro ao buscar registro de entrada." });
  }
}

async function exibirRegistroEntregaPorID(req, res) {
  try {
    const { idRegister } = req.params;

    const registro = await DeliveryRegister.findByPk(idRegister);

    if (!registro) {
      return res.status(404).json({ error: "Registro de entrega não encontrado." });
    }

    res.status(200).json({
      idRegister: registro.idRegister,
      nome: registro.nome,
      telefone: registro.telefone,
      data: registro.data,
      hrentrada: registro.hrentrada,
      placa: registro.placa,
      industria: registro.industria
    });
  } catch (err) {
    console.error("Erro ao buscar registro de entrega:", err);
    res.status(500).json({ error: "Erro ao buscar registro de entrega." });
  }
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
  editarRegistroEntrada,
  editarRegistroEntrega,
  exibirRegistroEntradaPorID,
  exibirRegistroEntregaPorID,
};
