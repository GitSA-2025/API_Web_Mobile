const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserAPP = require('../models/userApp')
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
    
