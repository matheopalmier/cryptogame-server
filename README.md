# CryptoGame Backend API

API backend pour l'application CryptoGame, développée avec Node.js, Express et MongoDB.

## Technologies utilisées

- Node.js
- Express.js
- TypeScript
- MongoDB avec Mongoose
- JWT pour l'authentification
- API CoinGecko pour les données de cryptomonnaies

## Configuration requise

- Node.js (v16 ou plus)
- MongoDB (en local ou un service cloud comme MongoDB Atlas)

## Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/your-username/cryptogame.git
cd cryptogame/backend
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez les variables d'environnement :
Créez un fichier `.env` à la racine du dossier backend avec les variables suivantes :
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cryptogame
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
INITIAL_BALANCE=10000
```

## Démarrage

Pour développement :
```bash
npm run dev
```

Pour production :
```bash
npm run build
npm start
```

## Structure du projet

```
backend/
├── src/
│   ├── config/        # Configuration (DB, etc.)
│   ├── controllers/   # Contrôleurs
│   ├── middlewares/   # Middlewares (auth, etc.)
│   ├── models/        # Modèles Mongoose
│   ├── routes/        # Routes API
│   ├── utils/         # Utilitaires
│   └── index.ts       # Point d'entrée de l'application
├── .env               # Variables d'environnement
├── package.json
└── tsconfig.json
```

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur (protégé)

### Crypto
- `GET /api/crypto/market` - Liste des cryptomonnaies
- `GET /api/crypto/:id` - Détails d'une cryptomonnaie
- `GET /api/crypto/:id/history` - Historique des prix

### Transactions
- `POST /api/transactions/buy` - Acheter une cryptomonnaie (protégé)
- `POST /api/transactions/sell` - Vendre une cryptomonnaie (protégé)
- `GET /api/transactions` - Historique des transactions (protégé)

### Utilisateurs
- `GET /api/users/leaderboard` - Classement des utilisateurs
- `GET /api/users/portfolio` - Portefeuille de l'utilisateur (protégé) 