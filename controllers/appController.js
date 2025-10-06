require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserAPP = require('../models/userApp');
const { DeliveryRegister } = require('../models');
const AccessRegister = require('../models/accessRegister');
const { generate2FACode } = require('../utils/generate2FACode');
const { send2FACode, transporter } = require('../services/mailService');
const sql = require('../db/db');
const { encrypt, decrypt } = require('../lib/crypto.js');

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


async function verificar2FAAPP(req, res) {
  const { email, codigo } = req.body;

  const result = await sql`
  SELECT * FROM userapp WHERE user_email = ${email}`;

  const user = result[0];

  if (!user || user.code2fa !== codigo) {
    return res.status(400).json({ error: 'Código inválido.' });
  }


  const env = await sql`
  UPDATE userapp SET verify2fa = 'true' WHERE id_user = ${user.id_user} RETURNING *`;

  res.json({
    message: '2FA verificado com sucesso!',
    usuario: env[0],
  });
}


async function loginAPP(req, res) {
  const { email, senha } = req.body;

  const result = await sql`
  SELECT * FROM userapp WHERE user_email = ${email}`;

  const user = result[0];

  if (!user || !(await bcrypt.compare(senha, user.user_password))) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (!user.verify2fa) return res.status(403).json({ error: '2FA não verificado' });

  const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
}

//precisa arrumar
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
    const { nome, telefone, placa, industria, n_fiscal, user_email } = req.body;

    console.log("Dados recebidos:", req.body);

    const agora = new Date();
    const data = agora.toISOString().split('T')[0];
    const hrentrada = agora.toTimeString().split(' ')[0];

    const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;

    const dados_user = user[0];

    const result = await sql`
      INSERT INTO deliveryRegister
        (name, phone, date, hr_entry, plate_vehicle, industry, n_fiscal, iduser)
      VALUES
        (${nome}, ${telefone}, ${data}, ${hrentrada}, ${placa}, ${industria}, ${n_fiscal}, ${dados_user.id_user})
      RETURNING *;
    `;

    res.status(201).json({
      message: 'Registro cadastrado!',
      registro_entrega: result[0],
    });
  } catch (err) {
    console.error('Erro no registro de entrega:', err);
    res.status(500).json({ error: 'Erro ao registrar a entrega. Detalhes no terminal.' });
  }
}


async function criarRegistroEntrada(req, res) {
  try {
    const { nome, tipo, cpf, placa, user_email } = req.body;

    if (!nome || !tipo || !cpf) {
      return res.status(400).json({ error: 'Nome, tipo de pessoa e CPF estão em branco. Preencha os campos corretamente.' });
    }

    const verifPlaca = placa && placa.trim() !== '' ? placa.trim() : 'Não se aplica.';

    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
      return res.status(400).json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.' });
    }

    const cpfHast = encrypt(cpf);

    const agora = new Date();
    const data = agora.toISOString().split('T')[0];
    const hrentrada = agora.toTimeString().split(' ')[0];

    const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;

    const dados_user = user[0];


    const result = await sql`
    INSERT INTO accessregister (name, cpf, type_person, date, hr_entry, hr_exit, car_plate, status, iduser) 
    VALUES (${nome}, ${cpfHast}, ${tipo}, ${data}, ${hrentrada}, '-', ${verifPlaca}, 'Liberado', ${dados_user.id_user}) RETURNING *`;


    res.status(201).json({
      message: 'Registro cadastrado!',
      registro_entrada: result[0],
    });

  }
  catch (err) {
    console.error('Erro ao registro entrada: ', err)
    res.status(500).json({ error: 'Erro ao registrar entrada.' });
  }
}

async function exbirRegistrosEntrega(req, res) {
  try {

    const { user_email } = req.body;

    const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;

    const dados_user = user[0];

    const result = await sql`SELECT * FROM deliveryRegister WHERE iduser = ${dados_user.id_user} ORDER BY date DESC, hr_entry DESC `;

    res.status(200).json(result);
  }
  catch (err) {
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({ error: 'Erro ao listar entregas.' });
  }
}

async function exbirRegistrosEntrada(req, res) {
  try {

    const { user_email } = req.body;

    const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;

    const dados_user = user[0];

    const result = await sql`SELECT * FROM accessregister WHERE iduser = ${dados_user.id_user} ORDER BY date DESC, hr_entry DESC`;

    res.status(200).json(result);
  }
  catch (err) {
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({ error: 'Erro ao listar entregas.' });
  }
}

//precisa arrumar
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
    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
      return res.status(400).json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.' });
    }

    const cpfHast = encrypt(cpf);

    const verifPlaca = placa && placa.trim() !== '' ? placa.trim() : 'Não se aplica.';

    const result = await sql`UPDATE accessregister
    SET name = ${nome}, type_person = ${tipo}, cpf = ${cpfHast}, car_plate = ${verifPlaca} 
    WHERE idRegister = ${idRegister} 
    RETURNING *`;

    res.status(201).json({
      message: 'Registro atualizado!',
      usuario: result[0],
    });
  }
  catch (err) {
    res.status(500).json({ error: "Erro ao atualizar o registro." });
    console.log(err);
  }
}

async function editarRegistroEntrega(req, res) {
  const { nome, telefone, placa, n_fiscal } = req.body;
  const idRegister = req.params.idRegister;
  try {

    const result = await sql`UPDATE deliveryRegister
    SET name = ${nome}, phone = ${telefone}, plate_vehicle = ${placa}, n_fiscal = ${n_fiscal} 
    WHERE idRegister = ${idRegister} 
    RETURNING *`;

    res.status(201).json({
      message: 'Registro atualizado!',
      usuario: result[0],
    });

  }
  catch (err) {
    res.status(500).json({ error: "Erro ao atualizar o registro." });
    console.log(err);
  }
}

async function exibirRegistroEntradaPorID(req, res) {
  try {
    const { idRegister } = req.params;

    const result = await sql`
    SELECT * FROM accessregister 
    WHERE idRegister = ${idRegister}`;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Registro de entrada não encontrado." });
    }


    const cpfVisivel = decrypt(result[0].cpf);

    res.status(200).json({
      idRegister: result[0].idRegister,
      nome: result[0].name,
      tipo: result[0].type_person,
      data: result[0].date,
      cpf: cpfVisivel,
      hrentrada: result[0].hr_entry,
      hrsaida: result[0].hr_exit,
      placa: result[0].car_plate
    });
  } catch (err) {
    console.error("Erro ao buscar registro de entrada:", err);
    res.status(500).json({ error: "Erro ao buscar registro de entrada." });
  }
}

async function exibirRegistroEntregaPorID(req, res) {
  try {
    const { idRegister } = req.params;

    const result = await sql`
    SELECT * FROM deliveryRegister 
    WHERE idRegister = ${idRegister}`;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Registro de entrega não encontrado." });
    }



    res.status(200).json({
      idRegister: result[0].idRegister,
      nome: result[0].name,
      telefone: result[0].phone,
      data: result[0].date,
      hrentrada: result[0].hr_entry,
      placa: result[0].plate_vehicle,
      industria: result[0].industry,
      n_nota: result[0].n_fiscal,
    });
  } catch (err) {
    console.error("Erro ao buscar registro de entrega:", err);
    res.status(500).json({ error: "Erro ao buscar registro de entrega." });
  }
}

async function marcarSaidaRegistroEntrada(req, res) {
  try {
    const { idRegister } = req.params;

    const agora = new Date();
    const hrsaida = agora.toTimeString().split(' ')[0];

    const result = await sql`
    UPDATE accessregister
    SET hr_exit = ${hrsaida}
    WHERE idRegister = ${idRegister} RETURNING *`;

    res.status(201).json({
      message: 'Saída registrada!',
      registro_entrada: result[0],
    });

  }
  catch (err) {
    console.error('Erro ao registrar saída: ', err)
    res.status(500).json({ error: 'Erro ao registrar saída.' + err });
  }
}

async function deletarRegistroEntrada(req, res) {
  try {
    const { idRegister } = req.params;

    const result = await sql`
    DELETE FROM accessregister
    WHERE idRegister = ${idRegister} RETURNING *`;

    res.status(201).json({
      message: 'Registro deletado!',
      registro_entrada: result[0],
    });
  }
  catch (err) {
    console.error('Erro ao deletar registro: ', err)
    res.status(500).json({ error: 'Erro ao deletar registro.' + err });
  }
}

async function deletarRegistroEntrega(req, res) {
  try {
    const { idRegister } = req.params;

    const result = await sql`
    DELETE FROM deliveryRegister
    WHERE idRegister = ${idRegister} RETURNING *`;

    res.status(201).json({
      message: 'Registro deletado!',
      registro_entrada: result[0],
    });
  }
  catch (err) {
    console.error('Erro ao deletar registro: ', err)
    res.status(500).json({ error: 'Erro ao deletar registro.' + err });
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
  marcarSaidaRegistroEntrada,
  deletarRegistroEntrada,
  deletarRegistroEntrega,
};
