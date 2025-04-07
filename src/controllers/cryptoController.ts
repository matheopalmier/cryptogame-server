import { Request, Response } from 'express';
import axios from 'axios';

// URL de l'API Coinlore (remplace CoinGecko)
const COINLORE_API_URL = 'https://api.coinlore.net/api';

// L'ancien mapping des logos a été supprimé car le système d'icônes ne fonctionnait pas correctement

// Fonction pour obtenir une URL d'icône pour une cryptomonnaie (utilise maintenant une image par défaut)
const getCryptoIconUrl = (symbol: string): string => {
  // Retourne une image par défaut pour toutes les cryptos
  return 'https://via.placeholder.com/32';
};

// @desc    Get top cryptocurrencies
// @route   GET /api/crypto/market
// @access  Public
export const getTopCryptos = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const page = parseInt(req.query.page as string) || 1;
    const start = (page - 1) * limit;
    
    const response = await axios.get(
      `${COINLORE_API_URL}/tickers/`,
      {
        params: {
          start,
          limit
        }
      }
    );

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Format de données Coinlore invalide');
    }

    const cryptos = response.data.data.map((item: any) => ({
      id: item.id,
      name: item.name,
      symbol: item.symbol.toUpperCase(),
      currentPrice: parseFloat(item.price_usd) || 0,
      marketCap: parseFloat(item.market_cap_usd) || 0,
      volume24h: parseFloat(item.volume24) || 0,
      priceChangePercentage24h: parseFloat(item.percent_change_24h) || 0,
      image: getCryptoIconUrl(item.symbol)
    }));

    res.status(200).json({
      success: true,
      count: cryptos.length,
      data: cryptos
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch cryptocurrency data'
    });
  }
};

// @desc    Get crypto details
// @route   GET /api/crypto/:id
// @access  Public
export const getCryptoDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Coinlore utilise des ID numériques
    let coinloreId = id;
    if (isNaN(Number(id))) {
      // Si l'ID n'est pas numérique, utiliser une logique de correspondance
      // Simplifiée ici, devrait être améliorée avec un mapping complet
      const mappings: {[key: string]: string} = {
        'bitcoin': '90',
        'ethereum': '80',
        'ripple': '58',
        'cardano': '2010',
        'solana': '48543'
      };
      coinloreId = mappings[id] || id;
    }

    const response = await axios.get(`${COINLORE_API_URL}/ticker/`, {
      params: { id: coinloreId }
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(`Crypto avec l'ID ${id} non trouvée`);
    }

    const item = response.data[0];
    
    const cryptoDetails = {
      id: id,
      name: item.name,
      symbol: item.symbol.toUpperCase(),
      description: "Description non disponible via Coinlore API",
      currentPrice: parseFloat(item.price_usd) || 0,
      marketCap: parseFloat(item.market_cap_usd) || 0,
      volume24h: parseFloat(item.volume24) || 0,
      priceChangePercentage24h: parseFloat(item.percent_change_24h) || 0,
      priceChangePercentage7d: parseFloat(item.percent_change_7d) || 0,
      circulatingSupply: parseFloat(item.csupply) || 0,
      totalSupply: parseFloat(item.tsupply) || 0,
      image: getCryptoIconUrl(item.symbol)
    };

    res.status(200).json({
      success: true,
      data: cryptoDetails
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch cryptocurrency details'
    });
  }
};

// @desc    Get crypto price history
// @route   GET /api/crypto/:id/history
// @access  Public
export const getCryptoPriceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    // Coinlore n'offre pas d'historique de prix comme CoinGecko
    // Nous allons générer des données simulées basées sur le prix actuel
    
    // D'abord, récupérons les informations actuelles de la crypto
    let coinloreId = id;
    if (isNaN(Number(id))) {
      const mappings: {[key: string]: string} = {
        'bitcoin': '90',
        'ethereum': '80',
        'ripple': '58',
        'cardano': '2010',
        'solana': '48543'
      };
      coinloreId = mappings[id] || id;
    }

    const response = await axios.get(`${COINLORE_API_URL}/ticker/`, {
      params: { id: coinloreId }
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(`Crypto avec l'ID ${id} non trouvée`);
    }

    const currentPrice = parseFloat(response.data[0].price_usd);
    const priceChange = parseFloat(response.data[0].percent_change_24h) / 100;
    
    // Générer un historique fictif
    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const pointsPerDay = 24; // Un point par heure
    const totalPoints = days * pointsPerDay;
    const millisecondsPerPoint = millisecondsPerDay / pointsPerDay;
    
    // Calculer le prix d'il y a [days] jours
    const volatility = 0.02; // 2% de volatilité par jour
    const trend = 1 + (priceChange / days); 
    const startingPrice = currentPrice / Math.pow(trend, days);
    
    // Générer les points de données
    const priceHistory = [];
    
    for (let i = 0; i < totalPoints; i++) {
      const timestamp = now - (totalPoints - i) * millisecondsPerPoint;
      const dayProgress = i / totalPoints;
      
      const trendComponent = startingPrice * Math.pow(trend, dayProgress * days);
      const randomComponent = (Math.random() - 0.5) * volatility * trendComponent;
      const price = trendComponent + randomComponent;
      
      priceHistory.push({
        timestamp,
        price
      });
    }
    
    // Ajouter le point final avec le prix actuel
    priceHistory.push({
      timestamp: now,
      price: currentPrice
    });

    res.status(200).json({
      success: true,
      count: priceHistory.length,
      data: priceHistory
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch price history'
    });
  }
}; 