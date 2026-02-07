'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fallbackPrices } from '@/constants/config';

interface UsePricesResult {
  prices: Record<string, number>;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch and auto-refresh prices for a list of symbols
 * Starts with fallback prices immediately, then fetches live prices in background
 */
export function usePrices(
  symbols: string[],
  refreshInterval: number = 30000 // 30 seconds default
): UsePricesResult {
  // Start with fallback prices immediately to avoid loading state
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    symbols.forEach(s => {
      initial[s] = fallbackPrices[s] || 100;
    });
    return initial;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const loadPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      const response = await fetch(
        `/api/prices?symbols=${encodeURIComponent(symbols.join(','))}`,
        { signal: AbortSignal.timeout(10000) } // 10 second timeout
      );

      if (!response.ok) throw new Error('API error');
      if (!isMounted.current) return;

      const data = await response.json();
      
      setPrices(prev => ({ ...prev, ...data.prices }));
      setIsLive(data.isLive);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      console.warn('Price fetch failed, using fallback prices');
      setIsLive(false);
      // Keep using fallback prices, don't set error to avoid UI disruption
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [symbols.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initial load (delayed to not block render)
  useEffect(() => {
    const timer = setTimeout(loadPrices, 100);
    return () => clearTimeout(timer);
  }, [loadPrices]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(loadPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [loadPrices, refreshInterval]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadPrices();
  }, [loadPrices]);

  return {
    prices,
    isLoading,
    isLive,
    error,
    refresh,
  };
}

/**
 * Hook to fetch a single price
 */
export function usePrice(symbol: string, refreshInterval: number = 30000) {
  const { prices, isLoading, isLive, error, refresh } = usePrices(
    symbol ? [symbol] : [],
    refreshInterval
  );

  return {
    price: prices[symbol] || fallbackPrices[symbol] || 0,
    isLoading,
    isLive,
    error,
    refresh,
  };
}

export default usePrices;

