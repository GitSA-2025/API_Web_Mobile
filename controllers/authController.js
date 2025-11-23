require('dotenv').config();

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
      expiresIn: "1h",
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


export async function gerarQRCodeController(c) {

  const supabase = getSupabase(c.env);

  try {
    let user_email = null;

    // Se vier via POST (body JSON)
    if (c.req.method === "POST") {
      const body = await c.req.json();
      user_email = body?.user_email;
    }

    // Se vier via GET (query string)
    if (c.req.method === "GET") {
      const url = new URL(c.req.url);
      user_email = url.searchParams.get("email");
    }

    if (!user_email) {
      return c.json({ error: "Email não informado." }, 400);
    }


    // Busca usuário
    const { data: dados_user, error: userError } = await supabase
      .from("userweb")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (userError || !dados_user) {
      return c.json({ error: "Usuário não encontrado." }, 404);
    }

    // Tenta descriptografar CPF
    
    let cpfVisivel;
    try{
      cpfVisivel = await decrypt(dados_user.cpf);
    }
    catch(e){
      console.warn("Erro ao descriptografar CPF:", e.message);
      cpfVisivel = "Indisponível";
    }

    console.log(cpfVisivel);

    // Busca solicitação de QRCode
    const { data: solicitacao, error: reqError } = await supabase
      .from("qrcode_requests")
      .select("*")
      .eq("id_requester", dados_user.id_user)
      .limit(1)
      .single();

    if (reqError && reqError.code !== "PGRST116") throw reqError;

    if (!solicitacao) {
      return c.json({
        error:
          "Nenhuma solicitação de QR Code encontrada. Por favor, solicite primeiro.",
      }, 403);
    }

    // --- STATUS APROVADO ---
    if (solicitacao.status === "aprovado") {


      // Remove solicitação usada
      const { error: delError } = await supabase
        .from("qrcode_requests")
        .delete()
        .eq("id_requester", dados_user.id_user);

      if (delError) throw delError;

      return c.json({
        status: "aprovado",
        userData: {
          id_user: dados_user.id_user,
          name: dados_user.name,
          cpf: cpfVisivel,
          user_email: dados_user.user_email,
          phone: dados_user.phone,
          type_user: dados_user.type_user,
          verify2fa: dados_user.verify2fa,
          plate: dados_user.plate
        }
      });
  }

    // --- STATUS PENDENTE ---
    if (solicitacao.status === "pendente") {
    return c.json({
      status: "pendente",
      message: "Solicitação pendente de aprovação do porteiro.",
    }, 200);
  }

  // --- STATUS NEGADO ---
  if (solicitacao.status === "negado") {
    await supabase
      .from("qrcode_requests")
      .delete()
      .eq("id_requester", dados_user.id_user);

    return c.json({
      status: "negado",
      error:
        "Sua solicitação foi negada. Por favor, faça uma nova solicitação.",
    }, 403);
  }

} catch (err) {
  console.error("Erro ao gerar QRCode:", err);
  return c.json({ error: "Erro ao gerar QRCode. Erro interno." }, 500);
}
}

export async function gerarQrCodeComLink(c) {

  const supabase = getSupabase(c.env);

  try {
    const user_email = await c.req.param("user_email");

    const { data: dados_user, error } = await supabase
      .from("userweb")
      .select("*")
      .eq("user_email", user_email)
      .single();

    if (error || !dados_user) {
      return c.json({ error: "Usuário não encontrado." }, 404);
    }

    if (dados_user.cpf) {
      try {
        dados_user.cpf = decrypt(dados_user.cpf);
      } catch (err) {
        console.warn("Não foi possível descriptografar o CPF:", err);
      }
    }

    // Monta o payload
    const payload = {
      id_user: dados_user.id_user,
      name: dados_user.name,
      cpf: dados_user.cpf,
      user_email: dados_user.user_email,
      phone: dados_user.phone,
      type_user: dados_user.type_user,
      verify2fa: dados_user.verify2fa,
    };

    // Gera o QRCode
    const qrCodeSvg = generateQRCode(payload);

    return c.json({
      qrCode: `data:image/svg+xml;base64,${btoa(qrCodeSvg)}`,
      status: "aprovado"
    });

  } catch (err) {
    console.error("Erro ao gerar QR Code:", err);
    return c.json({ error: "Erro ao gerar QRCode." }, 500);
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
    const user_email = await c.req.param("user_email");

    const { data: user } = await supabase
      .from("userweb")
      .select("id_user")
      .eq("user_email", user_email)
      .single();

    if (!user) return c.json({ error: "Usuário não encontrado." }, 404);

    const { data: existente } = await supabase
      .from("qrcode_requests")
      .select("*")
      .eq("id_requester", user.id_user)
      .eq("status", "pendente");

    if (existente && existente.length > 0) {
      return c.json({
        message: "Você já possui uma solicitação pendente.",
        status: "pendente",
      }, 200);
    }

    const { data: inserted, error } = await supabase
      .from("qrcode_requests")
      .insert([{ id_requester: user.id_user, status: "pendente" }])
      .select()
      .single();

    if (error) throw error;

    return c.json({
      message: "Solicitação feita com sucesso! Aguarde a aprovação.",
      request_id: inserted.id,
    }, 201);
  } catch (err) {
    console.error("Erro ao solicitar QR Code:", err);
    return c.json({ error: "Erro interno ao solicitar QR Code." }, 500);
  }
}

