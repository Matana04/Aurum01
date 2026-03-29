import express from 'express';
import * as AuthController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', AuthController.loginUsuario);
router.post('/logout', AuthController.logoutUsuario);
router.post('/admin', AuthController.loginAdmin);

export default router;
