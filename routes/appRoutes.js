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
  verContaAPP
} = require('../controllers/appController');

const authMiddleware = require('../middleware/auth');
const { editarPerfil } = require('../controllers/authController');

router.post('/app/cadastrar', cadastrarAPP);
router.post('/app/verificar-2fa', verificar2FAAPP);
router.post('/app/login', loginAPP);
router.post('/app/exibirEntradas', exbirRegistrosEntrada);
router.post('/app/exibirEntregas', exbirRegistrosEntrega);
router.post('/app/criarRegistroEntrada', criarRegistroEntrada);
router.post('/app/criarRegistroEntrega', criarRegistroEntrega);
router.post('/app/verConta', verContaAPP);
router.post('/app/editarConta', editarContaAPP);

module.exports = router;