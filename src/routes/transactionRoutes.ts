import express from 'express';
import { 
  buyCrypto, 
  sellCrypto, 
  getUserTransactions 
} from '../controllers/transactionController';
import { protect } from '../middlewares/auth';

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

router.post('/buy', buyCrypto);
router.post('/sell', sellCrypto);
router.get('/', getUserTransactions);

export default router; 