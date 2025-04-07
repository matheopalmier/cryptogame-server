import express from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { protect } from '../middlewares/auth';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.get('/me', protect, getCurrentUser);

export default router; 