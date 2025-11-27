import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
  cadastrar,
  verificar2FA,
  login,
  gerarQRCodeController,
  gerarQrCodeComLink,
  editarPerfil,
  verConta,
  solicitarQRCode,
} from "../controllers/authController.js";

// Criando o roteador Hono
const router = new Hono();

// ==================== ROTAS PÚBLICAS ==================== //
// Essas rotas podem ser acessadas sem autenticação

// Cadastro de usuário
router.post("/cadastrar", async (c) => await cadastrar(c));

// Verificação de 2FA
router.post("/verificar-2fa", async (c) => await verificar2FA(c));

// Login de usuário
router.post("/login", async (c) => await login(c));

// ==================== ROTAS PROTEGIDAS ==================== //
// Essas rotas requerem autenticação via 'authMiddleware'

// Consultar dados da conta do usuário
router.post("/conta", authMiddleware, async (c) => await verConta(c));

// Gerar QR Code (formato padrão)
router.post("/gerar-qrcode", authMiddleware, async (c) => await gerarQRCodeController(c));

// Gerar QR Code com link específico
router.post("/gerar-qrcode-link", authMiddleware, async (c) =>  await gerarQrCodeComLink(c));

// Editar perfil do usuário
router.post("/editar-perfil", authMiddleware, async (c) => await editarPerfil(c));

// Trocar senha do usuário
router.put("/trocar-senha", authMiddleware, async (c) => await trocarSenha(c));

// Enviar QR Code via WhatsApp
router.post("/enviar-qrcode-whatsapp", authMiddleware, async (c) => await enviarQrCodeWhatsapp(c));

// Solicitar QR Code para um usuário específico pelo e-mail
router.post("/solicitar-qrcode/:user_email", authMiddleware, async (c) => {
  const user_email = c.req.param("user_email");
  return await solicitarQRCode(c, user_email);
});

// ==================== ROTA DE VALIDAÇÃO DE QR CODE (Comentada) ==================== //
// Este bloco serve como referência para futura implementação de validação de QR Code
/*
router.post("/api/validar-qrcode", async (c) => {
  const body = await c.req.json();
  const { qrId } = body;

  if (!qrId) {
    return c.json({ error: "QR ID não fornecido." }, 400);
  }

  const { data: qrEntry, error } = await supabase
    .from("qrcode_entries")
    .select("*")
    .eq("id", qrId)
    .single();

  if (error || !qrEntry) {
    return c.json({ error: "QR Code inválido." }, 404);
  }

  if (qrEntry.usado) {
    return c.json({ error: "QR Code já utilizado." }, 400);
  }

  const agora = new Date();
  if (agora > new Date(qrEntry.expiresAt)) {
    return c.json({ error: "QR Code expirado." }, 400);
  }

  const { error: updateError } = await supabase
    .from("qrcode_entries")
    .update({ usado: true })
    .eq("id", qrId);

  if (updateError) throw updateError;

  return c.json({ message: "QR Code válido. Acesso autorizado." });
});
*/

// Exportando o roteador
export default router;
