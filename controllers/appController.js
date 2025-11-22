require('dotenv').config();

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generate2FACode } from "../utils/generate2FACode.js";
import { send2FACode } from "../services/mailService.js";
import { getSupabase } from "../db/db.js";
import { encrypt, decrypt } from "../lib/crypto.js";



async function cadastrarAPP(c) {

  const supabase = getSupabase(c.env);

  try {
    const { nome, email, telefone, senha } = await c.req.json();
    const senhaHash = await bcrypt.hash(senha, 10);
    const codigo2FA = generate2FACode();

    const { data, error } = await supabase
      .from("userapp")
      .insert([
        {
          name: nome,
          user_email: email,
          phone: telefone,
          user_password: senhaHash,
          code2fa: codigo2FA
        }
      ])
      .select();

    if (error) throw error;

    await send2FACode(email, codigo2FA);

    return c.json(
      {
        message: "Usuário cadastrado! Verifique o código enviado por e-mail.",
        usuario: data[0],
      },
      201
    );
  } catch (err) {
    console.error('Erro no cadastro:', err);
    return c.json(
      { error: "Erro ao cadastrar usuário. Detalhes no terminal." },
      500
    );
  }
}


async function verificar2FAAPP(c) {

  const supabase = getSupabase(c.env);

  const { email, codigo } = await c.req.json();

  const { data: user, error } = supabase
    .from("userapp")
    .select("*")
    .eq("user_email", email)
    .single();

  if (!user || user.code2fa !== codigo) {
    return c.json({ error: "Código inválido." }, 400);
  }

  await supabase
    .from("userapp")
    .update({ verify2fa: true })
    .eq("id_user", user.id_user);

  return c.json({
    message: '2FA verificado com sucesso!',
    usuario: user,
  });
}


async function loginAPP(c) {

  const supabase = getSupabase(c.env);

  const { email, senha } = await c.req.json();

  const { data: user } = await supabase
    .from("userapp")
    .select("*")
    .eq("user_email", email)
    .single();

  console.log(senha);

  if (!user || !(await bcrypt.compare(senha, user.user_password))) return c.json({ error: "Credenciais inválidas." }, 401);
  if (!user.verify2fa) return c.json({ error: "2FA não verificado." }, 403);

  const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return c.json({ token });
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

async function criarRegistroEntrega(c) {
  const supabase = getSupabase(c.env);

  try {
    const { nome, telefone, placa, industria, n_fiscal, user_email } = await c.req.json();

    console.log("Dados recebidos:", { nome, telefone, placa, industria, n_fiscal, user_email });

    const agora_brasil = new Date().toLocaleString('pt-BR', {
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

    const { data: user, error: userErr } = await supabase
      .from("userapp")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (userErr || !user) {
      return c.json({ error: 'Usuário não encontrado.' }, 400);
    }

    const { data, error } = await supabase
      .from("deliveryregister")
      .insert([
        {
          name: nome,
          phone: telefone,
          date: data_formatada,
          hr_entry: hrentrada,
          plate_vehicle: placa,
          industry: industria,
          n_fiscal: n_fiscal,
          iduser: user.id_user,
          type: 'entregador'
        }
      ])
      .select();

    if (error) throw error;

    return c.json(
      {
        message: 'Registro cadastrado!',
        registro_entrega: data[0],
      },
      201
    );

  } catch (err) {
    console.error('Erro no registro de entrega:', err);
    return c.json(
      { error: 'Erro ao registrar a entrega.', details: err.message },
      500
    );
  }
}


async function criarRegistroEntrada(c) {

  const supabase = getSupabase(c.env);

  try {
    const { nome, tipo, cpf, placa, user_email } = await c.req.json();

    if (!nome || !tipo || !cpf) {
      return c.json({ error: 'Nome, tipo de pessoa e CPF estão em branco. Preencha os campos corretamente.' }, 400);
    }

    const verifPlaca = placa && placa.trim() !== '' ? placa.trim() : 'Não se aplica.';

    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
      return c.json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.' }, 400);
    }

    const cpfHast = await encrypt(cpf);

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

    const { data: user } = await supabase
      .from("userapp")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (!user || user.length === 0) {
      return c.json({ error: 'Usuário logado não encontrado.' }, 404);
    }

    const dados_user = user;

    const { data, error } = await supabase
      .from("accessregister")
      .insert([
        {
          name: nome,
          cpf: cpfHast,
          type_person: tipo,
          date: data_formatada,
          hr_entry: hrentrada,
          hr_exit: '-',
          car_plate: verifPlaca,
          status: 'Liberado',
          iduser: dados_user.id_user
        }
      ])
      .select();

    if (error) throw error;

    return c.json({
      message: 'Registro cadastrado!',
      registro_entrada: data[0],
    }, 201);

  }
  catch (err) {
    console.error('Erro ao registro entrada: ', err);
    return c.json({ error: 'Erro ao registrar entrada.' }, 500);
  }
}

async function exbirRegistrosEntrega(c) {

  const supabase = getSupabase(c.env);

  try {

    const { user_email } = await c.req.json();

    const { data: user } = await supabase
      .from("userapp")
      .select("*")
      .eq("user_email", user_email)
      .single();

    const { data: entregas, error: entregaError } = await supabase
      .from("deliveryregister")
      .select("*")
      .eq("iduser", user.id_user)
      .order("date", { ascending: false })
      .order("hr_entry", { ascending: false });

    if (entregaError) throw entregaError;

    return c.json(entregas);

  }
  catch (err) {
    console.error('Erro ao listar entregas:', err);
    return c.json({ error: 'Erro ao listar entregas.' }, 500);
  }
}

async function exbirRegistrosEntrada(c) {

  const supabase = getSupabase(c.env);

  try {

    const { user_email } = await c.req.json();

    console.log(user_email);

    const { data: user } = await supabase
      .from("userapp")
      .select("*")
      .eq("user_email", user_email)
      .single();

    await fecharRegistrosEntradas(supabase);

    const { data: entradas, error: entradaError } = await supabase
      .from("accessregister")
      .select("*")
      .eq("iduser", user.id_user)
      .order("date", { ascending: false })
      .order("hr_entry", { ascending: false });

    if (entradaError) throw entradaError;

    return c.json(entradas);

  }
  catch (err) {
    console.error('Erro ao listar entradas:', err);
    return c.json({ error: 'Erro ao listar entradas.' }, 500);
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

async function editarRegistroEntrada(c) {

  const supabase = getSupabase(c.env);

  const { nome, tipo, cpf, placa } = await c.req.json();
  const idRegister = c.req.param("idregister");
  try {
    const cpfRegex = /^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
      return c.json({ error: 'Formato do CPF inválido. Use apenas 11 dígitos numéricos.' }, 400);
    }

    const cpfHast = await encrypt(cpf);

    const verifPlaca = placa && placa.trim() !== '' ? placa.trim() : 'Não se aplica.';

    const { data, error } = await supabase
      .from("accessregister")
      .update({
        name: nome,
        type_person: tipo,
        cpf: cpfHast,
        car_plate: verifPlaca,
      })
      .eq("idregister", idRegister)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: 'Registro atualizado!',
      usuario: data,
    }, 201);
  }
  catch (err) {
    console.log(err);
    return c.json({ error: "Erro ao atualizar o registro." }, 500);
  }
}

async function editarRegistroEntrega(c) {

  const supabase = getSupabase(c.env);

  const { nome, telefone, placa, n_fiscal } = await c.req.json();
  const idRegister = c.req.param("idregister");
  try {

    const { data, error } = await supabase
      .from("deliveryregister")
      .update({
        name: nome,
        phone: telefone,
        plate_vehicle: placa,
        n_fiscal: n_fiscal,
      })
      .eq("idregister", idRegister)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: 'Registro atualizado!',
      usuario: data,
    }, 201);

  }
  catch (err) {
    console.log(err);
    return c.json({ error: "Erro ao atualizar o registro." }, 500);
  }
}

export async function exibirRegistroEntradaPorID(c) {

  const supabase = getSupabase(c.env);

  try {
    const idRegister = await c.req.param("idregister");

    const { data: registro, error } = await supabase
      .from("accessregister")
      .select("*")
      .eq("idregister", idRegister)
      .single();



    if (error?.code === "PGRST116" || !registro) {
      console.log(registro);
      return c.json({ error: "Registro de entrada não encontrado.", registro }, 404);
    }

    if (error) throw error;

    let cpfVisivel;
    try {
      cpfVisivel = await decrypt(registro.cpf);
    } catch (e) {
      console.warn("Erro ao descriptografar CPF:", e.message);
      cpfVisivel = "Indisponível";
    }

    console.log(cpfVisivel);


    return c.json({
      idRegister: registro.idRegister,
      nome: registro.name,
      tipo: registro.type_person,
      data: registro.date,
      cpf: cpfVisivel,
      hrentrada: registro.hr_entry,
      hrsaida: registro.hr_exit,
      placa: registro.car_plate,
    }, 200);
  } catch (err) {
    console.error("Erro ao buscar registro de entrada:", err);
    return c.json({ error: "Erro ao buscar registro de entrada." }, 500);
  }
}

export async function exibirRegistroEntregaPorID(c) {

  const supabase = getSupabase(c.env);

  try {
    const idRegister = await c.req.param("idregister");

    const { data: registro, error } = await supabase
      .from("deliveryregister")
      .select("*")
      .eq("idregister", idRegister)
      .single();

    if (error?.code === "PGRST116" || !registro) {
      return c.json({ error: "Registro de entrega não encontrado." }, 404);
    }

    if (error) throw error;

    return c.json({
      idRegister: registro.idRegister,
      nome: registro.name,
      telefone: registro.phone,
      data: registro.date,
      hrentrada: registro.hr_entry,
      placa: registro.plate_vehicle,
      industria: registro.industry,
      n_nota: registro.n_fiscal,
    }, 200);
  } catch (err) {
    console.error("Erro ao buscar registro de entrega:", err);
    return c.json({ error: "Erro ao buscar registro de entrega." }, 500);
  }
}

export async function marcarSaidaRegistroEntrada(c) {

  const supabase = getSupabase(c.env);

  try {
    const idRegister = await c.req.param("idregister");

    const agora_brasil = new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const hrsaida = agora_brasil;

    const { data, error } = await supabase
      .from("accessregister")
      .update({ hr_exit: hrsaida })
      .eq("idregister", idRegister)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: "Saída registrada!",
      registro_entrada: data,
    }, 200);
  } catch (err) {
    console.error("Erro ao registrar saída:", err);
    return c.json({ error: "Erro ao registrar saída." }, 500);
  }
}

export async function deletarRegistroEntrada(c) {

  const supabase = getSupabase(c.env);

  try {
    const idRegister = c.req.param("idregister");

    const { data, error } = await supabase
      .from("accessregister")
      .delete()
      .eq("idregister", idRegister)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: "Registro deletado!",
      registro_entrada: data,
    }, 200);
  } catch (err) {
    console.error("Erro ao deletar registro:", err);
    return c.json({ error: "Erro ao deletar registro." }, 500);
  }
}

async function deletarRegistroEntrega(c) {

  const supabase = getSupabase(c.env);

  try {
    const idRegister = c.req.param("idregister");

    const { data, error } = await supabase
      .from("deliveryregister")
      .delete()
      .eq("idregister", idRegister)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: 'Registro deletado!',
      registro_entrada: data,
    }, 201);
  }
  catch (err) {
    console.error('Erro ao deletar registro: ', err)
    return c.json({ error: 'Erro ao deletar registro.' + err }, 500);
  }
}

export async function getUserByEmail(user_email) {

  const supabase = getSupabase(c.env);

  try {
    const { data: user, error } = await supabase
      .from("userapp")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (error) throw error;
    return user;
  } catch (err) {
    console.error("Erro ao buscar usuário por e-mail:", err);
    return null;
  }
}


export async function filtrarEntregas(c) {

  const supabase = getSupabase(c.env);

  try {
    const { user_email, filtro } = await c.req.json();

    const dados_user = await getUserByEmail(user_email);
    if (!dados_user) {
      return c.json({ error: "Usuário não encontrado." }, 404);
    }

    let orderCol = "date";
    let orderDir = { ascending: false };

    switch (filtro) {
      case "data_crescente":
        orderCol = "date";
        orderDir = { ascending: true };
        break;
      case "data_decrescente":
        orderCol = "date";
        orderDir = { ascending: false };
        break;
      case "hora_crescente":
        orderCol = "hr_entry";
        orderDir = { ascending: true };
        break;
      case "hora_decrescente":
        orderCol = "hr_entry";
        orderDir = { ascending: false };
        break;
      default:
        orderCol = "date";
        orderDir = { ascending: false };
        break;
    }

    const { data: result, error } = await supabase
      .from("deliveryregister")
      .select("*")
      .eq("iduser", dados_user.id_user)
      .order(orderCol, orderDir);

    if (error) throw error;

    return c.json(result);
  } catch (err) {
    console.error("Erro ao listar entregas:", err);
    return c.json({ error: "Erro ao listar entregas." }, 500);
  }
}

export async function filtrarEntradas(c) {

  const supabase = getSupabase(c.env);

  try {
    const { user_email, filtro } = await c.req.json();

    const dados_user = await getUserByEmail(user_email);
    if (!dados_user) {
      return c.json({ error: "Usuário não encontrado." }, 404);
    }

    let query = supabase.from("accessregister").select("*").eq("iduser", dados_user.id_user);

    switch (filtro) {
      case "data_crescente":
        query = query.order("date", { ascending: true });
        break;
      case "data_decrescente":
        query = query.order("date", { ascending: false });
        break;
      case "hora_crescente":
        query = query.order("date", { ascending: false }).order("hr_entry", { ascending: true });
        break;
      case "hora_decrescente":
        query = query.order("date", { ascending: false }).order("hr_entry", { ascending: false });
        break;
      default:
        query = query.order("date", { ascending: false }).order("hr_entry", { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) throw error;

    return c.json(data);
  } catch (err) {
    console.error("Erro ao filtrar entradas:", err);
    return c.json({ error: "Erro ao listar entradas." }, 500);
  }
}

export async function geradorDeGraficoIA(c) {

  const supabase = getSupabase(c.env);

  try {

    let body;

    try {
      body = await c.req.json();
      console.log("Body recebido:", body);
    } catch (e) {
      console.error("Erro ao ler o JSON do body:", e);
    }

    const { dataInicio, dataFim } = body || {};

    if (!dataInicio || !dataFim) {
      return c.json({ erro: "Datas não informadas" }, 400);
    }

    const { data: acessos, error: erroAcessos } = await supabase
      .from("accessregister")
      .select("type_person")
      .gte("date", dataInicio)
      .lte("date", dataFim);

    if (erroAcessos) throw erroAcessos;

    const { data: entregas, error: erroEntregas } = await supabase
      .from("deliveryregister")
      .select("idregister")
      .gte("date", dataInicio)
      .lte("date", dataFim);

    if (erroEntregas) throw erroEntregas;

    const totalColaboradores = acessos.filter(a => a.type_person === "colaborador").length;
    const totalVisitantes = acessos.filter(a => a.type_person === "visitante").length;
    const totalEntregadores = entregas.length;

    const grafico = [
      { label: "Colaboradores", value: totalColaboradores },
      { label: "Visitantes", value: totalVisitantes },
      { label: "Entregadores", value: totalEntregadores },
    ];

    return c.json({ grafico });
  } catch (err) {
    console.error("Erro ao gerar gráfico com IA:", err);
    return c.json({ erro: "Erro interno ao gerar gráfico com IA" }, 500);
  }
}


export async function aprovacaoQRCode(c) {
  const supabase = getSupabase(c.env);

  try {
    const { user_email, decisao } = await c.req.json();
    const id_request = c.req.param("id_request");

    if (!id_request) {
      return c.json({ error: "ID da solicitação não informado." }, 400);
    }

    console.log(user_email);

    const { data: user } = await supabase
      .from("userapp")
      .select("*")
      .eq("user_email", user_email)
      .single();

    const { data, error } = await supabase
      .from("qrcode_requests")
      .update({
        id_approver: dados_user.id_user,
        status: decisao,
      })
      .eq("id", id_request)
      .select()
      .single();

    if (error) throw error;

    return c.json(
      {
        message: "Status alterado com sucesso!",
        solicitacao: data,
      },
      200
    );
  } catch (err) {
    console.error("Erro ao alterar o status:", err);
    return c.json(
      { error: "Erro ao alterar o status da solicitação." },
      500
    );
  }
}


export async function verSolicitacoes(c) {

  const supabase = getSupabase(c.env);

  try {
    const { data: solicitacoes, error } = await supabase
      .from("qrcode_requests")
      .select("id, id_requester, status")
      .eq("status", "pendente");

    if (error) throw error;

    if (!solicitacoes || solicitacoes.length === 0) {
      return c.json({ message: "Nenhuma solicitação de QRCode encontrada." }, 404);
    }

    const resultados = await Promise.all(
      solicitacoes.map(async (solic) => {
        const { data: user } = await supabase
          .from("userweb")
          .select("name, user_email, type_user")
          .eq("id_user", solic.id_requester)
          .single();

        return {
          id: solic.id,
          id_requester: solic.id_requester,
          status: solic.status,
          name: user?.name?.trim() || "Sem nome",
          user_email: user?.user_email || "Sem email",
          type_user: user?.type_user || "Desconhecido",
        };
      })
    );

    return c.json(resultados);
  } catch (err) {
    console.error("Erro ao ver as solicitações de QRCode:", err);
    return c.json({ error: "Erro interno ao processar solicitações de QRCode." }, 500);
  }
}

async function fecharRegistrosEntradas(supabase) {
  try {
    const agora = new DataTransfer(
      new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo"
      })
    );

    const { data: registros, error } = await supabase
      .from('accessregister')
      .select('*')
      .or('hr_exit.is.null,hr_exit.eq.-');

    if (error) {
      console.error("Erro ao buscar registros:", error);
      return;
    }

    for (const reg of registros) {
      if (!reg.hr_entry || !reg.date_access) continue;

      const entrada = new Date(`${reg.date_access}T${reg.hr_entry}`);

      const diffMs = agora - entrada;
      const diffHoras = diffMs / (1000 * 60 * 60);

      if (diffHoras >= 6) {
        await supabase
          .from('accessregister')
          .update({
            hr_exit: agora.toTimeString().slice(0, 8)
          })
          .eq('idregister', reg.idregister);

        console.log(`✅ Saída automática registrada: ${reg.idregister}`);
      }
    }

  } catch (err) {
    console.error("Erro ao fechar registros:", err);
  }
}

export {
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
  deletarRegistroEntrega,
};

