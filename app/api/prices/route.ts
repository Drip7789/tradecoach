import { NextRequest, NextResponse } from 'next/server';

// Yahoo Finance chart API
const YAHOO_CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Cache prices for 30 seconds
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_DURATION_MS = 30000;

// Convert our symbols to Yahoo Finance format
function toYahooSymbol(symbol: string): string {
  if (symbol.includes('/')) {
    return symbol.replace('/', '') + '=X';
  }
  if (symbol === 'GOLD') return 'GC=F';
  if (symbol === 'SILVER') return 'SI=F';
  if (symbol === 'OIL') return 'CL=F';
  return symbol;
}

async function fetchPriceFromYahoo(symbol: string): Promise<number | null> {
  const yahooSymbol = toYahooSymbol(symbol);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const url = `${YAHOO_CHART_API}/${yahooSymbol}?range=1d&interval=1m&includePrePost=false`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://finance.yahoo.com',
        'Referer': 'https://finance.yahoo.com/',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      return null;
    }

    const meta = result.meta;
    const price = meta?.regularMarketPrice;
    
    if (price && typeof price === 'number') {
      return price;
    }
    
    if (meta?.previousClose) {
      return meta.previousClose;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim()).slice(0, 10);
  const prices: Record<string, number | null> = {};
  const now = Date.now();

  // Process symbols
  for (const symbol of symbols) {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      prices[symbol] = cached.price;
      continue;
    }

    // Fetch fresh price from Yahoo - NO FALLBACK
    const price = await fetchPriceFromYahoo(symbol);
    
    if (price !== null) {
      prices[symbol] = price;
      priceCache.set(symbol, { price, timestamp: now });
    } else {
      // Return null if we can't get real data
      prices[symbol] = null;
    }
    
    // Small delay between requests
    if (symbols.indexOf(symbol) < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Check if we have any real prices
  const validPrices = Object.values(prices).filter(p => p !== null);
  
  return NextResponse.json({
    prices,
    timestamp: new Date().toISOString(),
    isLive: validPrices.length > 0,
    unavailable: Object.entries(prices).filter(([_, v]) => v === null).map(([k]) => k),
  });
}
