const express = require('express');
const router = express.Router();
const {
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
  verSolicitacoes
} = require('../controllers/appController');

const { authMiddleware } = require('../middleware/auth');
const { editarPerfil } = require('../controllers/authController');

router.post('/app/cadastrar', cadastrarAPP);
router.post('/app/verificar-2fa', verificar2FAAPP);
router.post('/app/login', loginAPP);
router.post('/app/exibirEntradas', authMiddleware, exbirRegistrosEntrada);
router.post('/app/exibirEntregas', authMiddleware, exbirRegistrosEntrega);
router.post('/app/criarRegistroEntrada', authMiddleware, criarRegistroEntrada);
router.post('/app/criarRegistroEntrega', authMiddleware, criarRegistroEntrega);
router.get('/app/verConta', authMiddleware, verContaAPP);
router.post('/app/editarConta', authMiddleware, editarContaAPP);
router.post('/app/editarRegistroEntrada/:idRegister', authMiddleware, editarRegistroEntrada);
router.post('/app/editarRegistroEntrega/:idRegister', authMiddleware, editarRegistroEntrega);
router.get('/app/exibirEntradas/:idRegister', authMiddleware, exibirRegistroEntradaPorID);
router.get('/app/exibirEntregas/:idRegister', authMiddleware, exibirRegistroEntregaPorID);
router.get('/app/marcarSaidaRegistroEntrada/:idRegister', authMiddleware, marcarSaidaRegistroEntrada);
router.get('/app/deletarRegistroEntrada/:idRegister', authMiddleware, deletarRegistroEntrada);
router.get('/app/deletarRegistroEntrega/:idRegister', authMiddleware, deletarRegistroEntrega);
router.post('/app/filtrarEntregas', authMiddleware, filtrarEntregas);
router.post('/app/filtrarEntradas', authMiddleware, filtrarEntradas);
router.post('/app/gerarGraficoIA', authMiddleware, geradorDeGraficoIA);
router.post('/app/aprovQrCode/:id_request', authMiddleware, aprovacaoQRCode);
router.get('/app/verSolic', authMiddleware, verSolicitacoes);
module.exports = router;
