import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import {
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
} from "../controllers/appController.js";

const router = new Hono();

// Rotas públicas
router.post("/app/cadastrar", async (c) => await cadastrarAPP(c));
router.post("/app/verificar-2fa", async (c) => await verificar2FAAPP(c));
router.post("/app/login", async (c) => await loginAPP(c));

// Rotas protegidas
router.post("/app/exibirEntradas", authMiddleware, async (c) => await exbirRegistrosEntrada(c));
router.post("/app/exibirEntregas", authMiddleware, async (c) => await exbirRegistrosEntrega(c));
router.post("/app/criarRegistroEntrada", authMiddleware, async (c) => await criarRegistroEntrada(c));
router.post("/app/criarRegistroEntrega", authMiddleware, async (c) => await criarRegistroEntrega(c));

router.get("/app/verConta", authMiddleware, async (c) => await verContaAPP(c));
router.post("/app/editarConta", authMiddleware, async (c) => await editarContaAPP(c));

router.post("/app/editarRegistroEntrada/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await editarRegistroEntrada(c, idRegister);
});

router.post("/app/editarRegistroEntrega/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await editarRegistroEntrega(c, idRegister);
});

router.get("/app/exibirEntradas/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await exibirRegistroEntradaPorID(c, idRegister);
});

router.get("/app/exibirEntregas/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await exibirRegistroEntregaPorID(c, idRegister);
});

router.get("/app/marcarSaidaRegistroEntrada/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await marcarSaidaRegistroEntrada(c, idRegister);
});

router.get("/app/deletarRegistroEntrada/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await deletarRegistroEntrada(c, idRegister);
});

router.get("/app/deletarRegistroEntrega/:idRegister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idRegister");
  return await deletarRegistroEntrega(c, idRegister);
});

router.post("/app/filtrarEntradas", authMiddleware, async (c) => await filtrarEntradas(c));
router.post("/app/filtrarEntregas", authMiddleware, async (c) => await filtrarEntregas(c));
router.post("/app/gerarGraficoIA", authMiddleware, async (c) => await geradorDeGraficoIA(c));

router.post("/app/aprovQrCode/:id_request", authMiddleware, async (c) => {
  const id_request = c.req.param("id_request");
  return await aprovacaoQRCode(c, id_request);
});

router.get("/app/verSolic", authMiddleware, async (c) => await verSolicitacoes(c));

router.post("/app/editarPerfil", authMiddleware, async (c) => await editarPerfil(c));

export default router;
