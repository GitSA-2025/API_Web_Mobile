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

    const agora_brasil = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const [data_formatada_hora, hora_completa] = agora_brasil.split(', ');

    const data_formatada = data_formatada_hora.replace(/\//g, '-');

    const hrentrada = hora_completa.split(':').slice(0, 3).join(':');

    console.log(`Data formatada (dd-mm-aaaa): ${data_formatada}`);
    console.log(`Hora (BRT/BRST): ${hrentrada}`);


    const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const dados_user = user[0];

    const result = await sql`
      INSERT INTO deliveryRegister
        (name, phone, date, hr_entry, plate_vehicle, industry, n_fiscal, iduser, type)
      VALUES
        (${nome}, ${telefone}, ${data_formatada}, ${hrentrada}, ${placa}, ${industria}, ${n_fiscal}, ${dados_user.id_user}, 'entregador')
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

    const agora_brasil = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const [data_formatada_hora, hora_completa] = agora_brasil.split(', ');


    const data_formatada = data_formatada_hora.replace(/\//g, '-');


    const hrentrada = hora_completa.split(':').slice(0, 3).join(':');

    const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'Usuário logado não encontrado.' });
    }

    const dados_user = user[0];

    const result = await sql`
      INSERT INTO accessregister (name, cpf, type_person, date, hr_entry, hr_exit, car_plate, status, iduser) 
      VALUES (${nome}, ${cpfHast}, ${tipo}, ${data_formatada}, ${hrentrada}, '-', ${verifPlaca}, 'Liberado', ${dados_user.id_user}) 
      RETURNING *;
    `;

    res.status(201).json({
      message: 'Registro cadastrado!',
      registro_entrada: result[0],
    });

  }
  catch (err) {
    console.error('Erro ao registro entrada: ', err);
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

    console.log(user_email);

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

    const agora_brasil = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const hrsaida = agora_brasil;

    const result = await sql`
      UPDATE accessregister
      SET hr_exit = ${hrsaida}
      WHERE idRegister = ${idRegister} RETURNING *;
    `;

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

async function getUserByEmail(user_email) {
  const user = await sql`SELECT * FROM userapp WHERE user_email = ${user_email}`;
  return user[0];
}

async function filtrarEntregas(req, res) {
  try {
    const { user_email, filtro } = req.body;

    const dados_user = await getUserByEmail(user_email);
    if (!dados_user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let orderBy = 'ORDER BY date DESC, hr_entry DESC'; // padrão

    switch (filtro) {
      case 'data_crescente':
        orderBy = 'ORDER BY date ASC';
        break;
      case 'data_decrescente':
        orderBy = 'ORDER BY date DESC';
        break;
      case 'hora_crescente':
        orderBy = 'ORDER BY date DESC, hr_entry ASC';
        break;
      case 'hora_decrescente':
        orderBy = 'ORDER BY date DESC, hr_entry DESC';
        break;
      default:
        break;
    }

    const result = await sql.unsafe(
      `SELECT * FROM deliveryRegister WHERE iduser = $1 ${orderBy}`,
      [dados_user.id_user]
    );

    res.status(200).json(result);

  } catch (err) {
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({ error: 'Erro ao listar entregas.' });
  }
}

async function filtrarEntradas(req, res) {
  try {
    const { user_email, filtro } = req.body;

    const dados_user = await getUserByEmail(user_email);
    if (!dados_user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let orderBy = 'ORDER BY date DESC, hr_entry DESC'; // padrão

    switch (filtro) {
      case 'data_crescente':
        orderBy = 'ORDER BY date ASC';
        break;
      case 'data_decrescente':
        orderBy = 'ORDER BY date DESC';
        break;
      case 'hora_crescente':
        orderBy = 'ORDER BY date DESC, hr_entry ASC';
        break;
      case 'hora_decrescente':
        orderBy = 'ORDER BY date DESC, hr_entry DESC';
        break;
      default:
        break;
    }

    const result = await sql.unsafe(
      `SELECT * FROM accessRegister WHERE iduser = $1 ${orderBy}`,
      [dados_user.id_user]
    );

    res.status(200).json(result);

  } catch (err) {
    console.error('Erro ao listar entregas:', err);
    res.status(500).json({ error: 'Erro ao listar entregas.' });
  }
}

async function geradorDeGraficoIA(req, res) {
  try {
    const { dataInicio, dataFim } = req.body;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: "Datas não informadas" });
    }

    const acessos = await sql`
      SELECT type_person, COUNT(*) AS total
      FROM accessregister
      WHERE date BETWEEN ${dataInicio} AND ${dataFim}
      GROUP BY type_person
    `;
    const entregas = await sql`
      SELECT COUNT(*) AS total
      FROM deliveryregister
      WHERE date BETWEEN ${dataInicio} AND ${dataFim}
    `;

    const totalColaboradores =
      acessos.find((a) => a.type_person === "colaborador")?.total || 0;
    const totalVisitantes =
      acessos.find((a) => a.type_person === "visitante")?.total || 0;
    const totalEntregadores = entregas[0]?.total || 0;

    const grafico = [
      { label: "Colaboradores", value: Number(totalColaboradores) },
      { label: "Visitantes", value: Number(totalVisitantes) },
      { label: "Entregadores", value: Number(totalEntregadores) },
    ];

    res.json({ grafico });
  } catch (err) {
    console.error("Erro ao gerar gráfico com IA:", err);
    res.status(500).json({ erro: "Erro interno ao gerar gráfico com IA" });
  }

}

async function aprovacaoQRCode(req, res) {

  try {
    const { user_email, decisao } = req.body;

    const { id_request } = req.params;

    const dados_user = await getUserByEmail(user_email);
    if (!dados_user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const result = await sql`UPDATE qrcode_requests
    SET id_approver = ${dados_user.id_user}, status = ${decisao}
    WHERE id = ${id_request}`;

    res.status(201).json({
      message: 'Status alterado com sucesso!',
      solicitacao: result[0]
    });


  }
  catch (err) {
    res.status(500).json({ error: "Erro ao alterar os status." });
    console.log(err);
  }

}

async function verSolicitacoes(req, res) {
  try {
    const query = await sql`
      SELECT id, id_requester, status
      FROM qrcode_requests
      WHERE status = 'pendente'
    `;

    if (query.length === 0) {
      return res.status(404).json({ message: 'Nenhuma solicitação de QRCode encontrada.' });
    }

    const solicitacoes = await Promise.all(
      query.map(async (solic) => {
        const userQuery = await sql`
          SELECT name, user_email, type_user
          FROM userweb
          WHERE id_user = ${solic.id_requester}
        `;
        const user = userQuery[0];

        return {
          id: solic.id,         
          id_requester: solic.id_requester,      
          status: solic.status,
          name: user?.name?.trim() || 'Sem nome',
          user_email: user?.user_email || 'Sem email',
          type_user: user?.type_user || 'Desconhecido'
        };
      })
    );

    return res.status(200).json(solicitacoes);

  } catch (err) {
    console.error('Erro ao ver as solicitações de QRCode:', err);
    return res.status(500).json({ error: 'Erro interno ao processar solicitações de QRCode.' });
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
  filtrarEntregas,
  filtrarEntradas,
  geradorDeGraficoIA,
  aprovacaoQRCode,
  verSolicitacoes
};
