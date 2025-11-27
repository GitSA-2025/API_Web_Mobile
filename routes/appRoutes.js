import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
  cadastrarAPP,
  loginAPP,
  verificar2FAAPP,
  editarPerfil,
  criarRegistroEntrega,
  criarRegistroEntrada,
  exbirRegistrosEntrega,
  exbirRegistrosEntrada,
  editarRegistroEntrada,
  editarRegistroEntrega,
  exibirRegistroEntradaPorID,
  exibirRegistroEntregaPorID,
  marcarSaidaRegistroEntrada,
  deletarRegistroEntrada,
  deletarRegistroEntrega,
  geradorDeGraficoIA,
  filtrarEntradas,
  filtrarEntregas,
  aprovacaoQRCode,
  verSolicitacoes,
  verConta,
} from "../controllers/appController.js";

// Criando a instância do roteador Hono
const router = new Hono();

// ==================== ROTAS PÚBLICAS ==================== //
// Essas rotas não precisam de autenticação

// Cadastro de novo usuário
router.post("/app/cadastrar", async (c) => await cadastrarAPP(c));

// Verificação de 2FA
router.post("/app/verificar-2fa", async (c) => await verificar2FAAPP(c));

// Login de usuário
router.post("/app/login", async (c) => await loginAPP(c));

// ==================== ROTAS PROTEGIDAS ==================== //
// Todas essas rotas passam pelo middleware de autenticação
// 'authMiddleware' verifica se o usuário está logado

// Exibir todas as entradas
router.post("/app/exibirEntradas", authMiddleware, async (c) => await exbirRegistrosEntrada(c));

// Exibir todas as entregas
router.post("/app/exibirEntregas", authMiddleware, async (c) => await exbirRegistrosEntrega(c));

// Criar registro de entrada
router.post("/app/criarRegistroEntrada", authMiddleware, async (c) => await criarRegistroEntrada(c));

// Criar registro de entrega
router.post("/app/criarRegistroEntrega", authMiddleware, async (c) => await criarRegistroEntrega(c));

// Ver dados da conta
router.get("/app/verConta", authMiddleware, async (c) => await verContaAPP(c));

// Editar dados da conta
router.post("/app/editarConta", authMiddleware, async (c) => await editarContaAPP(c));

// Editar registro de entrada específico
router.post("/app/editarRegistroEntrada/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await editarRegistroEntrada(c, idRegister);
});

// Editar registro de entrega específico
router.post("/app/editarRegistroEntrega/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await editarRegistroEntrega(c, idRegister);
});

// Exibir registro de entrada por ID
router.get("/app/exibirEntradas/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await exibirRegistroEntradaPorID(c, idRegister);
});

// Exibir registro de entrega por ID
router.get("/app/exibirEntregas/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await exibirRegistroEntregaPorID(c, idRegister);
});

// Marcar saída de um registro de entrada
router.get("/app/marcarSaidaRegistroEntrada/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await marcarSaidaRegistroEntrada(c, idRegister);
});

// Deletar registro de entrada
router.get("/app/deletarRegistroEntrada/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await deletarRegistroEntrada(c, idRegister);
});

// Deletar registro de entrega
router.get("/app/deletarRegistroEntrega/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await deletarRegistroEntrega(c, idRegister);
});

// Filtrar registros de entradas
router.post("/app/filtrarEntradas", authMiddleware, async (c) => await filtrarEntradas(c));

// Filtrar registros de entregas
router.post("/app/filtrarEntregas", authMiddleware, async (c) => await filtrarEntregas(c));

// Gerar gráfico com IA
router.post("/app/gerarGraficoIA", authMiddleware, async (c) => await geradorDeGraficoIA(c));

// Aprovar solicitação via QR Code
router.post("/app/aprovQrCode/:id_request", authMiddleware, async (c) => {
  const id_request = c.req.param("id_request");
  return await aprovacaoQRCode(c, id_request);
});

// Ver solicitações pendentes
router.get("/app/verSolic", authMiddleware, async (c) => await verSolicitacoes(c));

// Editar perfil do usuário
router.post("/app/editarPerfil", authMiddleware, async (c) => await editarPerfil(c));

// Ver conta do usuário (rota alternativa)
router.post("/app/conta", authMiddleware, async (c) => await verConta(c));

// Exportando o roteador para ser usado no servidor principal
export default router;
