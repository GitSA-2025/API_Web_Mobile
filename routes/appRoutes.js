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

router.post("/app/editarRegistroEntrada/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await editarRegistroEntrada(c, idRegister);
});

router.post("/app/editarRegistroEntrega/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await editarRegistroEntrega(c, idRegister);
});

router.get("/app/exibirEntradas/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await exibirRegistroEntradaPorID(c, idRegister);
});

router.get("/app/exibirEntregas/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await exibirRegistroEntregaPorID(c, idRegister);
});

router.get("/app/marcarSaidaRegistroEntrada/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await marcarSaidaRegistroEntrada(c, idRegister);
});

router.get("/app/deletarRegistroEntrada/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
  return await deletarRegistroEntrada(c, idRegister);
});

router.get("/app/deletarRegistroEntrega/:idregister", authMiddleware, async (c) => {
  const idRegister = c.req.param("idregister");
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
router.post("/app/conta", authMiddleware, async (c) => await verConta(c));

export default router;
