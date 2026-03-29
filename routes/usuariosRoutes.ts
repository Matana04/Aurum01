import express from 'express';
import * as UsuariosController from '../controllers/usuariosController.js';

const router = express.Router();

router.post('/usuarios', UsuariosController.cadastrarUsuario);
router.get('/usuarios', UsuariosController.listarUsuarios);
router.get('/usuarios/:id', UsuariosController.obterUsuarioPorId);
router.put('/usuarios/:id', UsuariosController.atualizarUsuario);
router.delete('/usuarios/:id', UsuariosController.deletarUsuario);

export default router;
