import { Request, Response } from 'express';
import User from '../models/User';
import axios from 'axios';

// URL de l'API Coinlore (remplace CoinGecko)
const COINLORE_API_URL = 'https://api.coinlore.net/api';

// Système de cache simple pour les prix des cryptos 
const cryptoPriceCache: { 
  [key: string]: { 
    price: number; 
    timestamp: number; 
    name: string; 
    symbol: string;
  } 
} = {};

// Durée de validité du cache en millisecondes (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;

// Mapping des IDs entre format standard et Coinlore
const COIN_MAPPING: { [key: string]: string } = {
  'bitcoin': '90',
  'ethereum': '80',
  'ripple': '58',
  'cardano': '2010',
  'solana': '48543',
  'polkadot': '41417',
  'dogecoin': '2',
  'binancecoin': '2710',
  'matic-network': '3890',
  // Ajoutez d'autres correspondances selon vos besoins
};

// Fonction pour récupérer les données d'une crypto avec cache et retries
const getCryptoWithCache = async (cryptoId: string): Promise<{ 
  price: number; 
  name: string; 
  symbol: string; 
}> => {
  // Vérifier si les données sont en cache et toujours valides
  if (cryptoPriceCache[cryptoId] && Date.now() - cryptoPriceCache[cryptoId].timestamp < CACHE_TTL) {
    console.log(`🔄 Utilisation des données en cache pour ${cryptoId}`);
    return {
      price: cryptoPriceCache[cryptoId].price,
      name: cryptoPriceCache[cryptoId].name,
      symbol: cryptoPriceCache[cryptoId].symbol
    };
  }
  
  // Délai progressif entre les tentatives
  const retryDelays = [1000, 3000, 5000]; 
  let attempt = 0;
  
  // Trouver l'ID Coinlore correspondant
  let coinloreId = COIN_MAPPING[cryptoId];
  
  // Si l'ID standard n'est pas dans notre mapping, vérifier si c'est un ID numérique direct
  if (!coinloreId) {
    if (!isNaN(Number(cryptoId)) || cryptoId.startsWith('coin-')) {
      coinloreId = cryptoId.replace('coin-', '');
    } else {
      console.warn(`⚠️ ID de crypto non reconnu: ${cryptoId}`);
      // Fallback pour les IDs inconnus
      return {
        price: 0,
        name: cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1),
        symbol: cryptoId.slice(0, 3).toUpperCase()
      };
    }
  }
  
  while (attempt <= retryDelays.length) {
    try {
      console.log(`📡 Tentative ${attempt + 1} pour récupérer les données de ${cryptoId} (ID Coinlore: ${coinloreId})`);
      
      const response = await axios.get(`${COINLORE_API_URL}/ticker/`, {
        params: { id: coinloreId }
      });
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error(`Crypto avec l'ID ${cryptoId} non trouvée`);
      }
      
      const item = response.data[0];
      
      const data = {
        price: parseFloat(item.price_usd) || 0,
        name: item.name,
        symbol: item.symbol.toUpperCase(),
        timestamp: Date.now()
      };
      
      // Sauvegarder dans le cache
      cryptoPriceCache[cryptoId] = data;
      
      console.log(`✅ Données récupérées pour ${cryptoId}: $${data.price}`);
      return data;
    } catch (error: any) {
      attempt++;
      
      // Si c'est un rate limit et qu'on a encore des tentatives
      if (error.response && (error.response.status === 429 || error.response.status === 503) && attempt < retryDelays.length) {
        console.warn(`⚠️ Rate limit pour ${cryptoId}, nouvelle tentative dans ${retryDelays[attempt-1]}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt-1]));
      } else {
        // Autres erreurs ou plus de tentatives
        console.error(`❌ Impossible de récupérer les données pour ${cryptoId} après ${attempt} tentatives`);
        
        // Si on a des données en cache, même périmées, les utiliser comme fallback
        if (cryptoPriceCache[cryptoId]) {
          console.warn(`⚠️ Utilisation des données périmées pour ${cryptoId}`);
          return {
            price: cryptoPriceCache[cryptoId].price,
            name: cryptoPriceCache[cryptoId].name,
            symbol: cryptoPriceCache[cryptoId].symbol
          };
        }
        
        // Sinon, retourner des valeurs par défaut
        return {
          price: 0,
          name: cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1),
          symbol: cryptoId.slice(0, 3).toUpperCase()
        };
      }
    }
  }
  
  // Fallback au cas où on sort de la boucle sans retour
  return {
    price: 0,
    name: cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1),
    symbol: cryptoId.slice(0, 3).toUpperCase()
  };
};

// Fonction pour calculer les profits et le classement
const calculateUserStats = async (): Promise<void> => {
  try {
    console.log('📊 Calcul des statistiques utilisateurs...');
    // 1. Récupérer tous les utilisateurs
    const users = await User.find();

    // 2. Récupérer les prix actuels des cryptos
    const cryptoIds = new Set<string>();
    users.forEach((user) => {
      user.portfolio.forEach((item) => {
        cryptoIds.add(item.cryptoId);
      });
    });

    console.log(`📊 Récupération des prix pour ${cryptoIds.size} cryptomonnaies...`);
    const cryptoPrices: { [key: string]: number } = {};
    
    // Pour chaque crypto unique, récupérer son prix avec le nouveau système de cache
    for (const cryptoId of cryptoIds) {
      try {
        const data = await getCryptoWithCache(cryptoId);
        cryptoPrices[cryptoId] = data.price;
        console.log(`📊 Prix de ${cryptoId}: $${cryptoPrices[cryptoId]}`);
      } catch (error) {
        console.error(`❌ Impossible de récupérer le prix pour ${cryptoId}`, error);
        // Fallback à un prix par défaut pour éviter les erreurs
        cryptoPrices[cryptoId] = 0;
      }
    }

    console.log(`📊 Calcul des profits pour ${users.length} utilisateurs...`);
    // 3. Calculer la valeur totale du portefeuille et la plus-value pour chaque utilisateur
    for (const user of users) {
      let portfolioValue = 0;
      let investmentValue = 0;

      // Calculer la valeur actuelle du portefeuille et l'investissement initial
      user.portfolio.forEach((item) => {
        if (cryptoPrices[item.cryptoId] !== undefined) {
          const currentValue = item.amount * cryptoPrices[item.cryptoId];
          const initialInvestment = item.amount * item.averageBuyPrice;
          
          portfolioValue += currentValue;
          investmentValue += initialInvestment;
        }
      });

      // Valeur totale = solde + valeur du portefeuille
      const totalValue = user.balance + portfolioValue;
      
      // Investissement initial = 10000 (montant initial) - solde actuel + investissement dans les cryptos
      const initialInvestmentTotal = Number(process.env.INITIAL_BALANCE || 10000);
      
      // Calculer le pourcentage de profit
      const profitPercentage = ((totalValue - initialInvestmentTotal) / initialInvestmentTotal) * 100;

      console.log(`📊 Utilisateur ${user.username}: Solde=${user.balance}, Valeur portefeuille=${portfolioValue}, Total=${totalValue}, Profit=${profitPercentage.toFixed(2)}%`);

      // Mettre à jour l'utilisateur
      user.profitPercentage = profitPercentage;
      // Stocker également la valeur totale pour le classement
      user.totalValue = totalValue;
      await user.save();
    }

    // 4. Trier les utilisateurs par valeur totale (solde + portefeuille) et mettre à jour leur rang
    const sortedUsers = await User.find().sort({ totalValue: -1 });
    
    for (let i = 0; i < sortedUsers.length; i++) {
      sortedUsers[i].rank = i + 1;
      await sortedUsers[i].save();
      console.log(`📊 Rang ${i + 1}: ${sortedUsers[i].username} avec ${sortedUsers[i].totalValue}$ (profit: ${sortedUsers[i].profitPercentage?.toFixed(2)}%)`);
    }

  } catch (error) {
    console.error('❌ Erreur lors du calcul des statistiques utilisateur:', error);
  }
};

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Mettre à jour les statistiques avant d'envoyer le classement (dans une vraie application, cela serait fait par un job cron)
    await calculateUserStats();

    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('username avatar balance portfolio rank profitPercentage totalValue')
      .sort({ totalValue: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    // Transformer les données pour le leaderboard
    const leaderboard = users.map((user) => {
      // Calculer la valeur du portefeuille (totalValue - balance)
      const portfolioValue = (user.totalValue || user.balance) - user.balance;
      
      return {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        balance: user.balance,
        portfolioValue: portfolioValue, // Valeur calculée des actifs
        totalValue: user.totalValue || user.balance, // Valeur totale (solde + actifs)
        assetsCount: user.portfolio.length,
        rank: user.rank,
        profitPercentage: user.profitPercentage || 0
      };
    });

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: leaderboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get user portfolio with current values
// @route   GET /api/users/portfolio
// @access  Private
export const getUserPortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;

    // Trouver l'utilisateur
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Récupérer les cryptos IDs du portefeuille
    const cryptoIds = user.portfolio.map(item => item.cryptoId);

    if (cryptoIds.length === 0) {
      // Si le portefeuille est vide, retourner des données vides
      res.status(200).json({
        success: true,
        data: {
          balance: user.balance,
          portfolio: [],
          totalValue: user.balance,
          profitPercentage: user.profitPercentage || 0
        }
      });
      return;
    }

    // Récupérer les prix actuels avec le système de cache
    const cryptoPrices: { [key: string]: { price: number; name: string; symbol: string; } } = {};
    
    for (const cryptoId of cryptoIds) {
      try {
        const cryptoData = await getCryptoWithCache(cryptoId);
        cryptoPrices[cryptoId] = {
          price: cryptoData.price,
          name: cryptoData.name,
          symbol: cryptoData.symbol,
        };
      } catch (error) {
        console.error(`Failed to fetch details for ${cryptoId}`);
      }
    }

    // Calculer les détails du portefeuille
    const portfolio = user.portfolio.map(item => {
      const cryptoDetails = cryptoPrices[item.cryptoId];
      
      if (!cryptoDetails) return null;
      
      const currentPrice = cryptoDetails.price;
      const totalValue = item.amount * currentPrice;
      const investmentValue = item.amount * item.averageBuyPrice;
      const profitLoss = totalValue - investmentValue;
      const profitLossPercentage = investmentValue > 0 
        ? (profitLoss / investmentValue) * 100 
        : 0;

      return {
        cryptoId: item.cryptoId,
        name: cryptoDetails.name,
        symbol: cryptoDetails.symbol,
        amount: item.amount,
        averageBuyPrice: item.averageBuyPrice,
        currentPrice,
        totalValue,
        profitLoss,
        profitLossPercentage
      };
    }).filter(item => item !== null);

    // Calculer la valeur totale
    const portfolioValue = portfolio.reduce((total, item) => total + (item?.totalValue || 0), 0);
    const totalValue = user.balance + portfolioValue;

    res.status(200).json({
      success: true,
      data: {
        balance: user.balance,
        portfolio,
        portfolioValue,
        totalValue,
        profitPercentage: user.profitPercentage || 0,
        rank: user.rank || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
}; 