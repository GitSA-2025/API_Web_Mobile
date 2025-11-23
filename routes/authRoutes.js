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

const router = new Hono();

// --- Rotas públicas ---
router.post("/cadastrar", async (c) => await cadastrar(c));
router.post("/verificar-2fa", async (c) => await verificar2FA(c));
router.post("/login", async (c) => await login(c));

// --- Rotas protegidas ---
router.post("/conta", authMiddleware, async (c) => await verConta(c));

router.post("/gerar-qrcode", authMiddleware, async (c) => await gerarQRCodeController(c));

router.post("/gerar-qrcode-link", authMiddleware, async (c) =>  await gerarQrCodeComLink(c));

router.put("/editar-perfil", authMiddleware, async (c) => await editarPerfil(c));
router.put("/trocar-senha", authMiddleware, async (c) => await trocarSenha(c));
router.post("/enviar-qrcode-whatsapp", authMiddleware, async (c) => await enviarQrCodeWhatsapp(c));

router.post("/solicitar-qrcode/:user_email", authMiddleware, async (c) => {
  const user_email = c.req.param("user_email");
  return await solicitarQRCode(c, user_email);
});

// --- (Comentado) Validação de QR Code ---
// Caso queira adaptar futuramente, aqui vai o formato correto:
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

export default router;
