import express from 'express';
import * as DespesasController from '../controllers/despesasController.js';

const router = express.Router();

router.post('/despesas', DespesasController.cadastrarDespesa);
router.get('/despesas', DespesasController.listarDespesas);
router.get('/despesas/:id', DespesasController.obterDespesaPorId);
router.put('/despesas/:id', DespesasController.atualizarDespesa);
router.delete('/despesas/:id', DespesasController.deletarDespesa);

export default router;
