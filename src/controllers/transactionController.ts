import { Request, Response } from 'express';
import User, { IUser, IPortfolioItem } from '../models/User';
import Transaction, { ITransaction } from '../models/Transaction';
import axios from 'axios';

// URL de l'API Coinlore (remplace CoinGecko)
const COINLORE_API_URL = 'https://api.coinlore.net/api';

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

// Cache simple pour stocker les prix récemment récupérés (durée de validité: 5 minutes)
const priceCache: {
  [key: string]: {
    price: number;
    name: string;
    symbol: string;
    timestamp: number;
  }
} = {};

// Fonction helper pour obtenir le prix actuel d'une crypto
const getCurrentPrice = async (cryptoId: string): Promise<{
  price: number;
  name: string;
  symbol: string;
}> => {
  // Vérifier si on a un prix en cache récent (moins de 10 minutes)
  const now = Date.now();
  const cacheExpiry = 10 * 60 * 1000; // 10 minutes en millisecondes (augmenté)
  
  if (priceCache[cryptoId] && (now - priceCache[cryptoId].timestamp) < cacheExpiry) {
    console.log(`Using cached price for ${cryptoId}`);
    return {
      price: priceCache[cryptoId].price,
      name: priceCache[cryptoId].name,
      symbol: priceCache[cryptoId].symbol
    };
  }
  
  // Trouver l'ID Coinlore correspondant
  let coinloreId = COIN_MAPPING[cryptoId];
  
  // Si l'ID standard n'est pas dans notre mapping, vérifier si c'est un ID numérique direct
  if (!coinloreId) {
    if (!isNaN(Number(cryptoId)) || cryptoId.startsWith('coin-')) {
      coinloreId = cryptoId.replace('coin-', '');
    } else {
      console.warn(`⚠️ ID de crypto non reconnu: ${cryptoId}`);
      // Essayer les fallbacks plus bas
    }
  }
  
  // Essayer Coinlore en premier
  if (coinloreId) {
    try {
      console.log(`Fetching current price for ${cryptoId} (ID Coinlore: ${coinloreId}) from Coinlore API`);
      const response = await axios.get(`${COINLORE_API_URL}/ticker/`, {
        params: { id: coinloreId },
        timeout: 15000 // Timeout augmenté à 15 secondes
      });
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error(`Crypto avec l'ID ${cryptoId} non trouvée`);
      }
      
      const item = response.data[0];
      
      const data = {
        price: parseFloat(item.price_usd) || 0,
        name: item.name,
        symbol: item.symbol.toUpperCase()
      };
      
      // Mettre en cache le résultat
      priceCache[cryptoId] = {
        ...data,
        timestamp: now
      };
      
      console.log(`Successfully fetched price from Coinlore: ${data.price} USD`);
      return data;
    } catch (coinloreError) {
      console.error(`Error fetching price from Coinlore for ${cryptoId}:`, coinloreError);
    }
  }
  
  // Si nous avons des données en cache, même expirées, les utiliser comme fallback
  if (priceCache[cryptoId]) {
    console.log(`Using expired cache for ${cryptoId} as fallback`);
    return {
      price: priceCache[cryptoId].price,
      name: priceCache[cryptoId].name,
      symbol: priceCache[cryptoId].symbol
    };
  }
  
  // Essayer l'API Coinlore tickers comme fallback
  try {
    console.log(`Trying Coinlore tickers API for any crypto info`);
    const marketResponse = await axios.get(
      `${COINLORE_API_URL}/tickers/`,
      {
        params: {
          limit: 100
        },
        timeout: 10000
      }
    );
    
    if (marketResponse.data && marketResponse.data.data && Array.isArray(marketResponse.data.data)) {
      // Essayer de trouver la crypto par son nom ou symbole
      const cryptoIdLower = cryptoId.toLowerCase();
      const crypto = marketResponse.data.data.find((c: any) => 
        c.name.toLowerCase() === cryptoIdLower || 
        c.symbol.toLowerCase() === cryptoIdLower
      );
      
      if (crypto) {
        const data = {
          price: parseFloat(crypto.price_usd) || 0,
          name: crypto.name,
          symbol: crypto.symbol.toUpperCase()
        };
        
        // Mettre en cache
        priceCache[cryptoId] = {
          ...data,
          timestamp: now
        };
        
        console.log(`Successfully matched and fetched price from Coinlore tickers: ${data.price} USD`);
        return data;
      }
    }
  } catch (marketsError) {
    console.error('Failed to fetch from Coinlore tickers API:', marketsError);
  }
  
  // Essayer des valeurs prédéfinies comme fallback final
  try {
    console.log(`Using predefined values for ${cryptoId}`);
    
    // Définir un prix par défaut pour les cryptos les plus courantes
    const commonCryptos: {[key: string]: {price: number; name: string; symbol: string}} = {
      'bitcoin': { price: 40000, name: 'Bitcoin', symbol: 'BTC' },
      'ethereum': { price: 2000, name: 'Ethereum', symbol: 'ETH' },
      'binancecoin': { price: 300, name: 'Binance Coin', symbol: 'BNB' },
      'solana': { price: 100, name: 'Solana', symbol: 'SOL' },
      'cardano': { price: 0.50, name: 'Cardano', symbol: 'ADA' },
      'ripple': { price: 0.50, name: 'XRP', symbol: 'XRP' }
    };
    
    if (commonCryptos[cryptoId]) {
      const data = commonCryptos[cryptoId];
      
      // Mettre en cache avec une durée plus courte car ce n'est pas un prix réel
      priceCache[cryptoId] = {
        ...data,
        timestamp: now
      };
      
      console.log(`Using predefined price for ${cryptoId}: ${data.price} USD`);
      return data;
    }
  } catch (alternativeError) {
    console.error('Failed to use predefined values:', alternativeError);
  }
  
  // En dernier recours, retourner des valeurs par défaut
  console.error(`No price data available for ${cryptoId}, returning default values`);
  return {
    price: 0,
    name: cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1).replace(/-/g, ' '),
    symbol: cryptoId.substring(0, 3).toUpperCase()
  };
};

// @desc    Buy cryptocurrency
// @route   POST /api/transactions/buy
// @access  Private
export const buyCrypto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cryptoId, amount } = req.body;
    const userId = req.user._id;

    console.log(`👤 Utilisateur ${userId} tente d'acheter ${amount} de ${cryptoId}`);

    // Valider les entrées
    if (!cryptoId || !amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide valid cryptoId and amount'
      });
      return;
    }

    // Obtenir le prix actuel
    console.log(`🔍 Récupération du prix pour ${cryptoId}`);
    const { price, name, symbol } = await getCurrentPrice(cryptoId);
    console.log(`💰 Prix récupéré pour ${cryptoId}: $${price}`);
    
    // Vérifier si le prix est valide
    if (price <= 0) {
      console.log(`⚠️ Prix invalide (${price}) pour ${cryptoId}`);
      res.status(400).json({
        success: false,
        message: 'Cannot process transaction with invalid price. Please try again later.'
      });
      return;
    }
    
    const totalCost = amount * price;
    console.log(`💰 Coût total de la transaction: $${totalCost}`);

    // Trouver l'utilisateur
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    console.log(`👤 Solde de l'utilisateur: $${user.balance}`);
    // Vérifier si l'utilisateur a assez d'argent
    if (user.balance < totalCost) {
      res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
      return;
    }

    // Mettre à jour le portefeuille
    const portfolioIndex = user.portfolio.findIndex(
      (item) => item.cryptoId === cryptoId
    );

    if (portfolioIndex >= 0) {
      // Mise à jour d'une crypto existante
      const existingItem = user.portfolio[portfolioIndex];
      const totalAmount = existingItem.amount + amount;
      const totalCostBasis = existingItem.amount * existingItem.averageBuyPrice + totalCost;
      const newAverageBuyPrice = totalCostBasis / totalAmount;

      user.portfolio[portfolioIndex].amount = totalAmount;
      user.portfolio[portfolioIndex].averageBuyPrice = newAverageBuyPrice;
      console.log(`📈 Mise à jour du portefeuille: ${totalAmount} ${symbol} à un prix moyen de $${newAverageBuyPrice}`);
    } else {
      // Ajout d'une nouvelle crypto
      const newItem: IPortfolioItem = {
        cryptoId,
        amount,
        averageBuyPrice: price
      };
      user.portfolio.push(newItem);
      console.log(`🆕 Ajout d'une nouvelle crypto au portefeuille: ${amount} ${symbol} à $${price}`);
    }

    // Déduire le coût de l'achat du solde
    user.balance -= totalCost;
    console.log(`💸 Nouveau solde après achat: $${user.balance}`);

    // Sauvegarder les changements
    await user.save();
    console.log(`✅ Changements sauvegardés pour l'utilisateur ${userId}`);

    // Créer une transaction
    const transaction = await Transaction.create({
      userId,
      cryptoId,
      cryptoName: name,
      cryptoSymbol: symbol,
      type: 'buy',
      amount,
      price,
      total: totalCost,
      timestamp: Date.now()
    });
    console.log(`📝 Transaction enregistrée: ${transaction._id}`);

    res.status(201).json({
      success: true,
      data: {
        transaction,
        newBalance: user.balance,
        portfolio: user.portfolio
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'achat de cryptomonnaie:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Sell cryptocurrency
// @route   POST /api/transactions/sell
// @access  Private
export const sellCrypto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cryptoId, amount } = req.body;
    const userId = req.user._id;

    console.log(`👤 Utilisateur ${userId} tente de vendre ${amount} de ${cryptoId}`);

    // Valider les entrées
    if (!cryptoId || !amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide valid cryptoId and amount'
      });
      return;
    }

    // Obtenir le prix actuel
    console.log(`🔍 Récupération du prix pour ${cryptoId}`);
    const { price, name, symbol } = await getCurrentPrice(cryptoId);
    console.log(`💰 Prix récupéré pour ${cryptoId}: $${price}`);
    
    // Vérifier si le prix est valide
    if (price <= 0) {
      console.log(`⚠️ Prix invalide (${price}) pour ${cryptoId}`);
      res.status(400).json({
        success: false,
        message: 'Cannot process transaction with invalid price. Please try again later.'
      });
      return;
    }
    
    const totalValue = amount * price;
    console.log(`💰 Valeur totale de la vente: $${totalValue}`);

    // Trouver l'utilisateur
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Vérifier si l'utilisateur possède cette cryptomonnaie
    const portfolioIndex = user.portfolio.findIndex(
      (item) => item.cryptoId === cryptoId
    );

    if (portfolioIndex === -1) {
      res.status(400).json({
        success: false,
        message: 'You do not own this cryptocurrency'
      });
      return;
    }

    const portfolioItem = user.portfolio[portfolioIndex];
    console.log(`👤 Actifs actuels: ${portfolioItem.amount} ${symbol}`);

    // Vérifier si l'utilisateur possède assez de cette cryptomonnaie
    if (portfolioItem.amount < amount) {
      res.status(400).json({
        success: false,
        message: 'Insufficient cryptocurrency amount'
      });
      return;
    }

    // Mettre à jour le portefeuille
    const newAmount = portfolioItem.amount - amount;

    if (newAmount > 0) {
      // Mettre à jour la quantité
      user.portfolio[portfolioIndex].amount = newAmount;
      console.log(`📉 Mise à jour du portefeuille: Reste ${newAmount} ${symbol}`);
    } else {
      // Supprimer la cryptomonnaie du portefeuille
      user.portfolio = user.portfolio.filter((_, index) => index !== portfolioIndex);
      console.log(`🗑️ Crypto ${symbol} supprimée du portefeuille (vendue en totalité)`);
    }

    // Ajouter la valeur de la vente au solde
    user.balance += totalValue;
    console.log(`💰 Nouveau solde après vente: $${user.balance}`);

    // Sauvegarder les changements
    await user.save();
    console.log(`✅ Changements sauvegardés pour l'utilisateur ${userId}`);

    // Créer une transaction
    const transaction = await Transaction.create({
      userId,
      cryptoId,
      cryptoName: name,
      cryptoSymbol: symbol,
      type: 'sell',
      amount,
      price,
      total: totalValue,
      timestamp: Date.now()
    });
    console.log(`📝 Transaction enregistrée: ${transaction._id}`);

    res.status(200).json({
      success: true,
      data: {
        transaction,
        newBalance: user.balance,
        portfolio: user.portfolio
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la vente de cryptomonnaie:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get user transactions
// @route   GET /api/transactions
// @access  Private
export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ userId });

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: transactions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
}; 