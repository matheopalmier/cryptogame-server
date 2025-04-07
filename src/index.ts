import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import User from './models/User';
import bcrypt from 'bcrypt';

// Routes
import authRoutes from './routes/authRoutes';
import cryptoRoutes from './routes/cryptoRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();

// Connecter à la base de données (mais ne pas bloquer le démarrage si la connexion échoue)
connectDB().catch(err => {
  console.log('MongoDB connection error:', err);
  console.log('Starting server without database connection. Some features will not work.');
});

// Middleware
app.use(cors({
  origin: '*', // Permet les requêtes de n'importe quelle origine en développement
  credentials: true
}));

// Configuration de Helmet pour permettre le fonctionnement des applications web
app.use(helmet({
  contentSecurityPolicy: false, // En développement, désactiver CSP
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' }
}));

app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

// Route de test
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to CryptoGame API' });
});

// Route de développement pour créer un utilisateur de test (uniquement en DEV)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/create-test-user', async (req: Request, res: Response) => {
    try {
      // Vérifier si l'utilisateur existe déjà
      const userExists = await User.findOne({ email: 'test@example.com' });
      
      if (userExists) {
        // Mettre à jour le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        await User.updateOne(
          { email: 'test@example.com' },
          { $set: { password: hashedPassword } }
        );
        
        res.status(200).json({
          success: true,
          message: 'Utilisateur de test mis à jour',
          credentials: { email: 'test@example.com', password: 'password123' }
        });
        return;
      }
      
      // Créer un nouvel utilisateur de test
      const testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123', // Sera haché automatiquement
        balance: 10000,
        portfolio: []
      });
      
      await testUser.save();
      
      res.status(201).json({
        success: true,
        message: 'Utilisateur de test créé',
        credentials: { email: 'test@example.com', password: 'password123' }
      });
    } catch (error: any) {
      console.error('Erreur création utilisateur test:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  });
  
  console.log('🧪 Route de développement activée: /api/dev/create-test-user');
}

// Middleware de gestion des erreurs
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error'
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
}); 