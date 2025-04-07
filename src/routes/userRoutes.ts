import express from 'express';
import { 
  getLeaderboard, 
  getUserPortfolio 
} from '../controllers/userController';
import { protect } from '../middlewares/auth';

const router = express.Router();

// Routes publiques
router.get('/leaderboard', getLeaderboard);

// Routes protégées
router.get('/portfolio', protect, getUserPortfolio);

export default router; 