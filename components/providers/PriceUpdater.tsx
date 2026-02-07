'use client';

import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';

/**
 * Background component that updates position prices
 * - Waits 3 seconds after mount before first fetch (non-blocking)
 * - Only fetches if there are positions to update
 * - Updates every 30 seconds
 * - Completely silent - no UI, no errors shown
 */
export function PriceUpdater() {
  const { positions, updatePrices } = usePortfolioStore();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Don't do anything if no positions
    if (positions.length === 0) return;

    const symbols = positions.map(p => p.symbol);

    const fetchAndUpdate = async () => {
      if (!isMounted.current) return;
      
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
          `/api/prices?symbols=${encodeURIComponent(symbols.join(','))}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeout);
        
        if (!response.ok || !isMounted.current) return;
        
        const data = await response.json();
        
        if (isMounted.current && data.prices) {
          updatePrices(data.prices);
        }
      } catch {
        // Silent fail - just use existing prices
      }
    };

    // Wait 3 seconds before first fetch to not block initial page load
    const initialDelay = setTimeout(fetchAndUpdate, 3000);
    
    // Then update every 30 seconds
    const interval = setInterval(fetchAndUpdate, 30000);

    return () => {
      isMounted.current = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [positions.length]); // Only re-run when position count changes

  return null;
}

export default PriceUpdater;
