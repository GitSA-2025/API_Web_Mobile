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
  exibirRegistroEntregaPorID
} = require('../controllers/appController');

const { authMiddleware } = require('../middleware/auth');
const { editarPerfil } = require('../controllers/authController');

router.post('/app/cadastrar', cadastrarAPP);
router.post('/app/verificar-2fa', verificar2FAAPP);
router.post('/app/login', loginAPP);
router.get('/app/exibirEntradas', authMiddleware, exbirRegistrosEntrada);
router.get('/app/exibirEntregas', authMiddleware, exbirRegistrosEntrega);
router.post('/app/criarRegistroEntrada', authMiddleware, criarRegistroEntrada);
router.post('/app/criarRegistroEntrega', authMiddleware, criarRegistroEntrega);
router.get('/app/verConta', authMiddleware, verContaAPP);
router.post('/app/editarConta', authMiddleware, editarContaAPP);
router.post('/app/editarRegistroEntrada/:idRegister', authMiddleware, editarRegistroEntrada);
router.post('/app/editarRegistroEntrega/:idRegister', authMiddleware, editarRegistroEntrega);
router.get('/app/exibirEntradas/:idRegister', authMiddleware, exibirRegistroEntradaPorID);
router.get('/app/exibirEntregas/:idRegister', authMiddleware, exibirRegistroEntregaPorID);
module.exports = router;
