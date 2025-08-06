const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const User = require('../models/user');
const { generate2FACode } = require('../utils/generate2FACode');
const { send2FACode, transporter } = require('../services/mailService');
const { generateQRCode, generateQRCodeAsFile } = require('../utils/generateQRCode');
const QRCodeEntry = require('../models/qrcode');

async function cadastrar(req, res) {
  try {
    const { nome, cpf, email, telefone, senha, tipo } = req.body;
    const senhaHash = await bcrypt.hash(senha, 10);
    const codigo2FA = generate2FACode();

    const user = await User.create({
      nome,
      cpf,
      email,
      telefone: telefone.replace(/\D/g, ''),
      senha: senhaHash,
      tipo,
      codigo2FA
    });

    await send2FACode(email, codigo2FA);
    res.status(201).json({ message: 'Usuário cadastrado! Verifique o código enviado por e-mail.' });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário. Detalhes no terminal.' });
  }
}

async function verificar2FA(req, res) {
  const { email, codigo } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || user.codigo2FA !== codigo) return res.status(400).json({ error: 'Código inválido.' });

  user.verificado2FA = true;
  await user.save();
  res.json({ message: '2FA verificado com sucesso!' });
}

async function login(req, res) {
  const { email, senha } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(senha, user.senha))) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (!user.verificado2FA) return res.status(403).json({ error: '2FA não verificado' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
}

async function verConta(req, res) {
  const user = await User.findByPk(req.userId);
  res.json(user);
}

async function gerarQRCodeController(req, res) {
  const user = await User.findByPk(req.userId);

  const qrEntry = await QRCodeEntry.create({
    userId: user.id,
    expiresAt: new Date(Date.now() + 45 * 60 * 1000)
  });

  const data = {
    qrId: qrEntry.id,
    nome: user.nome,
    cpf: user.cpf,
    email: user.email,
    telefone: user.telefone,
    tipo: user.tipo
  };

  const qrCode = await generateQRCode(data);
  res.json({ qrCode });
}

async function enviarQrCodeEmail(req, res) {
  try {
    const user = await User.findByPk(req.userId);

    const qrEntry = await QRCodeEntry.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + 45 * 60 * 1000)
    });

    const qrCodeData = {
      qrId: qrEntry.id,
      nome: user.nome,
      cpf: user.cpf,
      email: user.email,
      telefone: user.telefone,
      tipo: user.tipo
    };

    const qrCodeDataUrl = await generateQRCode(qrCodeData);
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: user.email,
      subject: 'Seu Crachá Digital - QR Code',
      html: `<div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; border-radius: 10px; max-width: 600px; margin: auto; color: #333;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);">
    
    <h2 style="font-size: 22px; margin-top: 0; color: #4CAF50;">Seu crachá digital chegou!</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Olá, <strong>${user.nome}</strong>! 👋<br>
      Abaixo está o seu QR Code pessoal. Guarde este e-mail com segurança.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <img src="cid:qrcode" alt="QR Code do Crachá Digital" style="max-width: 220px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
    </div>

    <p style="font-size: 15px; color: #555;">
      Aproxime este QR Code do scanner da portaria para realizar sua identificação.<br>
      Aguarde a liberação do acesso após a leitura.
      Lembrando que o código é válido pelos próximos 45 minutos após a geração.
    </p>

    <p style="font-size: 14px; color: #888; margin-top: 30px;">
      Qualquer dúvida, entre em contato com nossa equipe de suporte.<br>
      Obrigado por utilizar nosso sistema! 💼
    </p>

    <p style="font-size: 14px; color: #999;">
      Atenciosamente,<br>
      <strong>Equipe do SA</strong>
    </p>

  </div>
</div>`,
      attachments: [
        {
          filename: 'qrcode.png',
          content: Buffer.from(base64Data, 'base64'),
          cid: 'qrcode'
        }
      ]
    });

    res.json({ message: "QR Code enviado por e-mail com sucesso!" });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: "Erro ao enviar QR Code por e-mail." });
  }
}

async function gerarQrCodeComLink(req, res) {
  try {
    const user = await User.findByPk(req.userId);
    const qrPath = await generateQRCodeAsFile({
      nome: user.nome,
      cpf: user.cpf,
      email: user.email,
      telefone: user.telefone,
      tipo: user.tipo
    });
    const fullUrl = `${req.protocol}://${req.get('host')}${qrPath}`;
    res.json({ qrCodeUrl: fullUrl });
  } catch (err) {
    console.error('Erro ao gerar QR Code com link:', err);
    res.status(500).json({ error: "Erro ao gerar QR Code." });
  }
}

async function enviarQrCodeWhatsapp(req, res) {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }


    const qrFilePath = await generateQRCodeAsFile({
      nome: user.nome,
      cpf: user.cpf,
      email: user.email,
      telefone: user.telefone,
      tipo: user.tipo
    });


    if (!fs.existsSync(qrFilePath)) {
      console.error("Arquivo de QR Code não encontrado no caminho esperado:", qrFilePath);
      return res.status(500).json({ error: "Erro interno: Arquivo do QR Code não foi gerado corretamente." });
    }

    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const phone = `55${user.telefone.replace(/\D/g, '')}`;

    const imageData = fs.readFileSync(qrFilePath, { encoding: 'base64' });

    const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/image`, {
      token,
      to: phone,
      image: imageData,
      filename: "crachá.png",
      caption: `👋 Olá, ${user.nome}!

Aqui está o seu 📲 *Crachá Digital* com QR Code para acesso.

⏱️ Ele é válido por *45 minutos* a partir do envio.

📌 Aproxime o código do leitor da portaria para ser identificado.

Qualquer dúvida, conte com a gente!

Equipe SA 💼`
    });


    if (response.data.sent === 'true') {

      fs.unlink(qrFilePath, (err) => {
        if (err) console.error("Erro ao deletar arquivo QR Code:", err);
      });
      res.json({ message: "QR Code enviado com sucesso via WhatsApp!" });
    } else {
      console.error("Resposta da UltraMsg (erro ou não enviado):", response.data);
      res.status(500).json({ error: "Erro ao enviar via UltraMsg", details: response.data });
    }
  } catch (err) {
    console.error("Erro ao enviar QR Code via WhatsApp:", err.message, err.stack); 
    res.status(500).json({ error: "Erro interno ao enviar QR Code via WhatsApp." });
  }
}


async function editarPerfil(req, res) {
  const { nome, telefone, email, tipo } = req.body;
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    user.nome = nome;
    user.telefone = telefone.replace(/\D/g, '');
    user.email = email;
    user.tipo = tipo;
    await user.save();
    res.json({ message: "Perfil atualizado com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
}

async function trocarSenha(req, res) {
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
}

module.exports = {
  cadastrar,
  verificar2FA,
  login,
  verConta,
  gerarQRCodeController,
  enviarQrCodeEmail,
  gerarQrCodeComLink,
  enviarQrCodeWhatsapp,
  editarPerfil,
  trocarSenha
};
