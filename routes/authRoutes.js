const express = require('express');
const router = express.Router();
const {
    cadastrar,
    verificar2FA,
    login,
    verConta,
    gerarQRCodeController,
    enviarQrCodeEmail,
    gerarQrCodeComLink,
    editarPerfil,
    trocarSenha,
    enviarQrCodeWhatsapp
} = require('../controllers/authController');
const QRCodeEntry = require('../models/qrcode');

const { authMiddleware } = require('../middleware/auth');

router.post('/cadastrar', cadastrar);
router.post('/verificar-2fa', verificar2FA);
router.post('/login', login);
router.get('/conta', authMiddleware, verConta);
router.get('/gerar-qrcode', authMiddleware, gerarQRCodeController);
router.post('/enviar-qrcode-email', authMiddleware, enviarQrCodeEmail);
router.get('/gerar-qrcode-link', authMiddleware, gerarQrCodeComLink);
router.put('/editar-perfil', authMiddleware, editarPerfil);
router.put('/trocar-senha', authMiddleware, trocarSenha);
router.post('/enviar-qrcode-whatsapp', authMiddleware, enviarQrCodeWhatsapp);

router.post('/api/validar-qrcode', async (req, res) => {
  try {
    const { qrId } = req.body;

    const qrEntry = await QRCodeEntry.findByPk(qrId);
    if (!qrEntry) return res.status(404).json({ error: 'QR Code inválido.' });

    if (qrEntry.usado) return res.status(400).json({ error: 'QR Code já utilizado.' });

    if (new Date() > qrEntry.expiresAt)
      return res.status(400).json({ error: 'QR Code expirado.' });

    qrEntry.usado = true;
    await qrEntry.save();

    res.json({ message: 'QR Code válido. Acesso autorizado.' });
  } catch (err) {
    console.error('Erro ao validar QR Code:', err);
    res.status(500).json({ error: 'Erro ao validar QR Code.' });
  }
});

module.exports = router;
