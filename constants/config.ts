// BiasCoach Configuration

export const config = {
  // Price Data
  priceApi: {
    refreshIntervalMs: 15000, // 15 seconds for real-time updates
    cacheTimeMs: 15000, // Cache prices for 15 seconds
  },

  // Trading Configuration
  trading: {
    defaultFeeRate: 0.001, // 0.1% per trade
    minTradeValue: 1,
    maxPositionPercent: 0.5, // Max 50% in single position
    defaultStartingBalance: 100000, // $100k paper trading
  },

  // Analysis Configuration
  analysis: {
    minTradesForAnalysis: 10,
    reanalysisThreshold: 10, // Re-analyze every N trades
    cacheDurationMs: 5 * 60 * 1000, // 5 minutes
  },

  // UI Configuration
  ui: {
    chartAnimationDuration: 800,
    refreshInterval: 30000, // 30 seconds
    maxRecentTrades: 50,
    pageSize: 20,
  },

  // Discipline Score Weights
  disciplineWeights: {
    tradePacing: 0.20,
    riskManagement: 0.25,
    lossRecovery: 0.20,
    diversification: 0.15,
    emotionalControl: 0.20,
  },
};

// Supported trading symbols - Forex and Stocks focus
export const tradableSymbols = {
  forex: [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar' },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar' },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
    { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
    { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
    { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
    { symbol: 'EUR/GBP', name: 'Euro / British Pound' },
    { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen' },
    { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen' },
    { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
  ],
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'HD', name: 'Home Depot Inc.' },
    { symbol: 'BAC', name: 'Bank of America Corp.' },
  ],
  etfs: [
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
    { symbol: 'DIA', name: 'Dow Jones ETF' },
    { symbol: 'IWM', name: 'Russell 2000 ETF' },
  ],
  commodities: [
    { symbol: 'GOLD', name: 'Gold' },
    { symbol: 'SILVER', name: 'Silver' },
    { symbol: 'OIL', name: 'Crude Oil' },
  ],
};

// Fallback prices for demo/offline mode
export const fallbackPrices: Record<string, number> = {
  'EUR/USD': 1.0875,
  'GBP/USD': 1.2650,
  'USD/JPY': 149.50,
  'USD/CAD': 1.3580,
  'AUD/USD': 0.6520,
  'USD/CHF': 0.8790,
  'EUR/GBP': 0.8590,
  'GBP/JPY': 188.75,
  'EUR/JPY': 162.50,
  'NZD/USD': 0.6150,
  'AAPL': 227.50,
  'MSFT': 401.00,
  'GOOGL': 185.30,
  'AMZN': 225.40,
  'TSLA': 355.60,
  'NVDA': 125.50,
  'META': 685.20,
  'JPM': 255.80,
  'V': 335.40,
  'JNJ': 152.20,
  'WMT': 95.30,
  'PG': 165.80,
  'MA': 528.60,
  'HD': 395.40,
  'BAC': 45.80,
  'SPY': 602.35,
  'QQQ': 528.20,
  'DIA': 440.50,
  'IWM': 228.30,
  'GOLD': 2875.50,
  'SILVER': 32.50,
  'OIL': 71.25,
};

// Get price helper
export const getPrice = (symbol: string): number => {
  return fallbackPrices[symbol] || fallbackPrices[symbol.toUpperCase()] || 100;
};

// Get all tradable assets as flat array
export const getAllAssets = () => {
  return [
    ...tradableSymbols.stocks.map(s => ({ ...s, type: 'stocks' as const })),
    ...tradableSymbols.forex.map(s => ({ ...s, type: 'forex' as const })),
    ...tradableSymbols.etfs.map(s => ({ ...s, type: 'etfs' as const })),
    ...tradableSymbols.commodities.map(s => ({ ...s, type: 'commodities' as const })),
  ];
};

export default config;

