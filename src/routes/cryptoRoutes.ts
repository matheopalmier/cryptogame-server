import express from 'express';
import { 
  getTopCryptos, 
  getCryptoDetails, 
  getCryptoPriceHistory 
} from '../controllers/cryptoController';

const router = express.Router();

// Routes publiques
router.get('/market', getTopCryptos);
router.get('/:id', getCryptoDetails);
router.get('/:id/history', getCryptoPriceHistory);

export default router; 