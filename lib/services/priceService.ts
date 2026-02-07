// Real-time Price Service for BiasCoach
// Fetches live prices from Yahoo Finance via our API route

import { fallbackPrices } from '@/constants/config';

interface PriceResponse {
  prices: Record<string, number>;
  timestamp: string;
  isLive: boolean;
}

// In-memory cache for client-side
const clientCache: Map<string, { price: number; timestamp: number }> = new Map();
const CLIENT_CACHE_DURATION_MS = 10000; // 10 seconds

// Track if we're using live or fallback prices
let isUsingLivePrices = false;

/**
 * Fetch a single price
 */
export async function fetchPrice(symbol: string): Promise<number> {
  const now = Date.now();
  
  // Check client cache
  const cached = clientCache.get(symbol);
  if (cached && now - cached.timestamp < CLIENT_CACHE_DURATION_MS) {
    return cached.price;
  }

  try {
    const response = await fetch(`/api/prices?symbols=${encodeURIComponent(symbol)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: PriceResponse = await response.json();
    
    if (data.prices[symbol]) {
      isUsingLivePrices = true;
      clientCache.set(symbol, { price: data.prices[symbol], timestamp: now });
      return data.prices[symbol];
    }
  } catch (error) {
    console.warn(`Failed to fetch live price for ${symbol}, using fallback`);
  }

  // Fallback to static price
  isUsingLivePrices = false;
  return fallbackPrices[symbol] || 100;
}

/**
 * Fetch multiple prices at once (more efficient)
 */
export async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const now = Date.now();
  const results: Record<string, number> = {};
  const symbolsToFetch: string[] = [];

  // Check cache for each symbol
  for (const symbol of symbols) {
    const cached = clientCache.get(symbol);
    if (cached && now - cached.timestamp < CLIENT_CACHE_DURATION_MS) {
      results[symbol] = cached.price;
    } else {
      symbolsToFetch.push(symbol);
    }
  }

  // If all were cached, return immediately
  if (symbolsToFetch.length === 0) {
    return results;
  }

  try {
    const response = await fetch(
      `/api/prices?symbols=${encodeURIComponent(symbolsToFetch.join(','))}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: PriceResponse = await response.json();
    isUsingLivePrices = data.isLive;

    // Cache and add to results
    for (const symbol of symbolsToFetch) {
      if (data.prices[symbol]) {
        clientCache.set(symbol, { price: data.prices[symbol], timestamp: now });
        results[symbol] = data.prices[symbol];
      } else {
        // Use fallback
        results[symbol] = fallbackPrices[symbol] || 100;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch live prices, using fallbacks');
    isUsingLivePrices = false;
    
    // Use fallbacks for all unfetched symbols
    for (const symbol of symbolsToFetch) {
      results[symbol] = fallbackPrices[symbol] || 100;
    }
  }

  return results;
}

/**
 * Check if we're using live prices
 */
export function hasLivePrices(): boolean {
  return isUsingLivePrices;
}

/**
 * Clear the price cache (useful for forcing refresh)
 */
export function clearPriceCache(): void {
  clientCache.clear();
}

/**
 * Get price with optional real-time refresh
 * This is a sync version that returns cached/fallback immediately
 */
export function getPrice(symbol: string): number {
  const cached = clientCache.get(symbol);
  if (cached) {
    return cached.price;
  }
  return fallbackPrices[symbol] || 100;
}

export default {
  fetchPrice,
  fetchPrices,
  hasLivePrices,
  clearPriceCache,
  getPrice,
};

