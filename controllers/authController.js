import dotenv from 'dotenv';
dotenv.config();

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generate2FACode } from "../utils/generate2FACode.js";
import { send2FACode } from "../services/mailService.js";
import { generateQRCode, generateQRCodeAsFile } from "../utils/generateQRCode.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { getSupabase } from "../db/db.js";


export async function cadastrar(c) {

  const supabase = getSupabase(c.env);

  try {
    const { nome, cpf, email, telefone, senha, tipo, placa } = await c.req.json();
    const senhaHash = await bcrypt.hash(senha, 10);
    const codigo2FA = generate2FACode();
    const cpfHash = await encrypt(cpf);

    const { data, error } = await supabase
      .from("userweb")
      .insert([
        {
          name: nome,
          cpf: cpfHash,
          user_email: email,
          phone: telefone,
          user_password: senhaHash,
          type_user: tipo || "visitante",
          plate: placa,
          code2fa: codigo2FA,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    await send2FACode(email, codigo2FA);
    return c.json({
      message: "Usuário cadastrado! Verifique o código enviado por e-mail.",
      user: data,
    }, 201);
  } catch (err) {
    console.error("Erro no cadastro:", err);
    return c.json({ error: "Erro ao cadastrar usuário." }, 500);
  }
}

export async function verificar2FA(c) {

  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json();
    const user_email = body.user_email || body.email;
    const code = body.code || body.codigo;

    const { data: user } = await supabase
      .from("userweb")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (!user || user.code2fa !== code)
      return c.json({ error: "Código inválido ou expirado." }, 400);

    const { error } = await supabase
      .from("userweb")
      .update({ verify2fa: true })
      .eq("id_user", user.id_user);

    if (error) throw error;

    return c.json({ message: "2FA verificado com sucesso!" }, 200);
  } catch (err) {
    console.error("Erro ao verificar 2FA:", err);
    return c.json({ error: "Erro ao verificar 2FA." }), 500;
  }
}


export async function login(c) {

  const supabase = getSupabase(c.env);

  try {
    const { email, senha } = await c.req.json();

    const { data: user } = await supabase
      .from("userweb")
      .select("*")
      .eq("user_email", email)
      .single();

    if (!user || !(await bcrypt.compare(senha, user.user_password)))
      return c.json({ error: "Credenciais inválidas" }, 401);

    if (!user.verify2fa)
      return c.json({ error: "2FA não verificado" }, 403);

    const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    return c.json({ token });
  } catch (err) {
    console.error("Erro no login:", err);
    return c.json({ error: "Erro interno ao fazer login." }, 500);
  }
}

export async function verConta(c) {

  const supabase = getSupabase(c.env);

  try {
    const { user_email } = await c.req.json();

    const { data: user } = await supabase
      .from("userweb")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (!user) return c.json({ error: "Usuário não encontrado." }, 404);

    let cpfVisivel;
    try {
      cpfVisivel = await decrypt(user.cpf);
    } catch (e) {
      console.warn("Erro ao descriptografar CPF:", e.message);
      cpfVisivel = "Indisponível";
    }

    return c.json({
      id_user: user.id_user,
      name: user.name,
      cpf: cpfVisivel,
      user_email: user.user_email,
      phone: user.phone,
      type_user: user.type_user,
      verify2fa: user.verify2fa,
      plate: user.plate
    });
  } catch (err) {
    console.error("Erro ao buscar conta:", err);
    return c.json({ error: "Erro ao buscar conta." }, 500);
  }
}

export async function editarPerfil(c) {
  const supabase = getSupabase(c.env);

  const { nome, cpf, telefone, placa, user_email } = await c.req.json();

  const cpfHash = await encrypt(cpf);

  try {
    const { data, error } = await supabase
      .from("userweb")
      .update({
        name: nome,
        phone: telefone,
        plate: placa,
        cpf: cpfHash
      })
      .eq("user_email", user_email)
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
    return c.json({ error: "Erro ao atualizar o conta." }, 500);
  }
}


export async function gerarQRCodeController(c) {
  const supabase = getSupabase(c.env);

  try {
    let user_email = null;
    let request_id = null;

    if (c.req.method === "POST") {
      const body = await c.req.json();
      user_email = body?.user_email;
      request_id = body?.request_id || null;
    } else if (c.req.method === "GET") {
      const url = new URL(c.req.url);
      user_email = url.searchParams.get("email");
      request_id = url.searchParams.get("request_id");
    }

    if (!user_email) {
      return c.json({ error: "Email não informado." }, 400);
    }

    const { data: dados_user, error: userError } = await supabase
      .from("userweb")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (userError || !dados_user) {
      return c.json({ error: "Usuário não encontrado." }, 404);
    }

    let cpfVisivel;
    try {
      cpfVisivel = await decrypt(dados_user.cpf);
    } catch (e) {
      console.warn("Erro ao descriptografar CPF:", e.message);
      cpfVisivel = "Indisponível";
    }

    // Busca a solicitação específica (se enviada) ou a mais recente do usuário
    let query = supabase
      .from("qrcode_requests")
      .select("*")
      .eq("id_requester", dados_user.id_user);

    if (request_id) {
      query = query.eq("id", request_id);
    } else {
      query = query.order("created_at", { ascending: false }).limit(1);
    }

    const { data: solicitacoes, error: reqError } = await query;
    if (reqError && reqError.code !== "PGRST116") throw reqError;

    const solicitacao = solicitacoes ? solicitacoes[0] : null;

    if (!solicitacao || solicitacao.status === "expirado" || solicitacao.status === "gerado") {
      return c.json({
        error: "Nenhuma solicitação ativa encontrada. Por favor, solicite um novo QR Code.",
      }, 403);
    }

    if (solicitacao.status === "pendente") {
      return c.json({
        status: "pendente",
        request_id: solicitacao.id,
        message: "Solicitação pendente de aprovação do porteiro.",
      }, 200);
    }

    if (solicitacao.status === "negado") {
      return c.json({
        status: "negado",
        request_id: solicitacao.id,
        message: "Sua solicitação foi negada. Por favor, faça uma nova solicitação.",
      }, 200);
    }

    if (solicitacao.status === "aprovado") {
      const isVisitante = (dados_user.type_user || "").toLowerCase() === "visitante";
      const qrId = crypto.randomUUID();
      const expiresAt = isVisitante
        ? new Date(Date.now() + 45 * 60 * 1000).toISOString()
        : null;

      // Consome a solicitação aprovada para que não possa ser reutilizada em pedidos futuros
      await supabase
        .from("qrcode_requests")
        .update({ status: "gerado" })
        .eq("id", solicitacao.id);

      // Registra o QR Code diretamente na tabela qrcodes com o user_email correto
      await supabase.from("qrcodes").insert([
        {
          qr_id: qrId,
          user_email: dados_user.user_email,
          expires_at: expiresAt,
          used: false,
          single_use: isVisitante,
          created_at: new Date().toISOString(),
        },
      ]);

      return c.json({
        status: "aprovado",
        request_id: solicitacao.id,
        qrId,
        expiresAt,
        singleUse: isVisitante,
        userData: {
          id_user: dados_user.id_user,
          name: dados_user.name,
          cpf: cpfVisivel,
          user_email: dados_user.user_email,
          phone: dados_user.phone,
          type_user: dados_user.type_user,
          verify2fa: dados_user.verify2fa,
          plate: dados_user.plate,
        },
      }, 200);
    }
  } catch (err) {
    console.error("Erro ao gerar QRCode:", err);
    return c.json({ error: "Erro ao gerar QRCode. Erro interno." }, 500);
  }
}

/*async function trocarSenha(req, res) {
  const { senhaAtual, novaSenha } = req.body;
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    const senhaConfere = await bcrypt.compare(senhaAtual, user.senha);
    if (!senhaConfere) return res.status(403).json({ error: "Senha atual incorreta." });
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    user.senha = senhaHash;
    await user.save();
    res.json({ message: "Senha atualizada com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
}*/

export async function solicitarQRCode(c) {
  const supabase = getSupabase(c.env);

  try {
    const user_email = decodeURIComponent(c.req.param("user_email") || "").trim();

    if (!user_email) {
      return c.json({ error: "E-mail não informado." }, 400);
    }

    const { data: user, error: userErr } = await supabase
      .from("userweb")
      .select("id_user")
      .eq("user_email", user_email)
      .single();

    if (userErr || !user) {
      return c.json({ error: "Usuário não encontrado." }, 404);
    }

    // 1. Se já existe solicitação pendente, retorna ela mesma
    const { data: existente } = await supabase
      .from("qrcode_requests")
      .select("id, status")
      .eq("id_requester", user.id_user)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existente && existente.length > 0) {
      return c.json({
        message: "Você já possui uma solicitação pendente.",
        status: "pendente",
        request_id: existente[0].id,
      }, 200);
    }

    // 2. Expira solicitações antigas que ficaram com status "aprovado" para não vazar QR antigo
    await supabase
      .from("qrcode_requests")
      .update({ status: "expirado" })
      .eq("id_requester", user.id_user)
      .eq("status", "aprovado");

    // 3. Invalida QR Codes antigos de uso único ainda não utilizados desse visitante
    await supabase
      .from("qrcodes")
      .update({ used: true })
      .eq("user_email", user_email)
      .eq("single_use", true)
      .eq("used", false);

    // 4. Cria a nova solicitação pendente com timestamp UTC padronizado
    const { data: inserted, error } = await supabase
      .from("qrcode_requests")
      .insert([
        {
          id_requester: user.id_user,
          status: "pendente",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: "Solicitação feita com sucesso! Aguarde a aprovação.",
      status: "pendente",
      request_id: inserted.id,
    }, 201);
  } catch (err) {
    console.error("Erro ao solicitar QR Code:", err);
    return c.json({ error: "Erro interno ao solicitar QR Code." }, 500);
  }
}

export async function salvarQRCode(c) {
  const supabase = getSupabase(c.env);

  try {
    const { qrId, email, user_email, expiresAt, singleUse } = await c.req.json();
    const emailFinal = user_email || email;

    // Evita erro de duplicidade caso gerarQRCodeController já tenha registrado
    const { data: existente } = await supabase
      .from("qrcodes")
      .select("*")
      .eq("qr_id", qrId)
      .maybeSingle();

    if (existente) {
      return c.json({
        message: "QR Code já registrado.",
        qrcode: existente,
      }, 200);
    }

    const { data, error } = await supabase
      .from("qrcodes")
      .insert([
        {
          qr_id: qrId,
          user_email: emailFinal,
          expires_at: expiresAt,
          used: false,
          single_use: singleUse,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: "QR Code salvo com sucesso!",
      qrcode: data,
    }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Erro ao salvar QR Code" }, 500);
  }
}

export async function validarQRCode(c) {
  const supabase = getSupabase(c.env);
  const { qrId } = await c.req.json();

  const { data, error } = await supabase
    .from("qrcodes")
    .select("*")
    .eq("qr_id", qrId)
    .single();

  if (error || !data) {
    return c.json({ error: "QR Code inválido" }, 404);
  }

  if (data.single_use) {
    if (data.used) {
      return c.json({ error: "QR Code já utilizado" }, 400);
    }

    if (data.expires_at && new Date() > new Date(data.expires_at)) {
      return c.json({ error: "QR Code expirado" }, 400);
    }

    await supabase
      .from("qrcodes")
      .update({ used: true })
      .eq("qr_id", qrId);
  }

  return c.json({
    message: "Acesso liberado",
    email: data.user_email,
  });
}



