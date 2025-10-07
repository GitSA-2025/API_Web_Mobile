const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function send2FACode(email, code) {
  try {
    const response = await resend.emails.send({
      from: 'Sistema SA <accesssystemfatec@gmail.com>',
      to: email,
      subject: `${code} - Seu código de verificação do Sistema de Acesso/Crachá Online`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; border-radius: 10px; max-width: 600px; margin: auto; color: #333;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);">
            <h2 style="font-size: 22px; margin-top: 0; color: #4CAF50;">Verificação de e-mail</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Olá! 👋<br>
              Recebemos uma solicitação para verificar este endereço de e-mail em nosso sistema.
            </p>
            <p style="font-size: 16px; margin-bottom: 12px;">
              Use o código abaixo para confirmar sua identidade:
            </p>
            <div style="font-size: 24px; font-weight: bold; background-color: #e8f5e9; color: #2e7d32; padding: 12px 20px; display: inline-block; border-radius: 6px; letter-spacing: 3px; margin-bottom: 24px;">
              ${code}
            </div>
            <p style="font-size: 14px; color: #666;">
              Se você não solicitou essa verificação, pode ignorar esta mensagem com segurança.
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              Obrigado,<br>
              <strong>Equipe do SA</strong>
            </p>
          </div>
        </div>
      `,
    });

    console.log('✅ Código enviado com sucesso!', response);
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail:', err);
    throw new Error('Erro ao enviar e-mail');
  }
}

module.exports = { send2FACode };
