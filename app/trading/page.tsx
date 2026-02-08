'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { formatCurrency } from '@/lib/utils/formatters';
import { getAllAssets } from '@/constants/config';
import { AssetType } from '@/types';
import { toast } from '@/components/shared/Toast';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const ASSETS = getAllAssets();
const TOP_SYMBOLS = ASSETS.slice(0, 10).map(a => a.symbol);

export default function TradingPage() {
  const { cashBalance, positions, executeBuy, executeSell } = usePortfolioStore();
  
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [searchQuery, setSearchQuery] = useState('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState(false);
  
  // Prices for the asset list
  const [listPrices, setListPrices] = useState<Record<string, number | null>>({});
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Fetch prices for the asset list
  const fetchListPrices = useCallback(async () => {
    try {
      const response = await fetch(`/api/prices?symbols=${TOP_SYMBOLS.join(',')}`);
      if (!response.ok) return;
      const data = await response.json();
      setListPrices(data.prices || {});
    } catch {
      // Silent fail
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Initial fetch and refresh every 30 seconds
  useEffect(() => {
    fetchListPrices();
    const interval = setInterval(fetchListPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchListPrices]);

  // Fetch real price when symbol is selected - NO FALLBACK
  useEffect(() => {
    if (!selectedSymbol) {
      setLivePrice(null);
      setPriceError(false);
      return;
    }

    let cancelled = false;
    
    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      setPriceError(false);
      try {
        const response = await fetch(`/api/prices?symbols=${selectedSymbol}`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        if (!cancelled) {
          const price = data.prices[selectedSymbol];
          if (price !== null && price !== undefined) {
            setLivePrice(price);
            setPriceError(false);
            // Also update list prices
            setListPrices(prev => ({ ...prev, [selectedSymbol]: price }));
          } else {
            setLivePrice(null);
            setPriceError(true);
          }
        }
      } catch {
        if (!cancelled) {
          setLivePrice(null);
          setPriceError(true);
        }
      } finally {
        if (!cancelled) setIsLoadingPrice(false);
      }
    };

    fetchPrice();
    
    // Refresh price every 15 seconds
    const interval = setInterval(fetchPrice, 15000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  const selectedAsset = ASSETS.find(a => a.symbol === selectedSymbol);
  const price = livePrice; // No fallback - null means unavailable
  const qty = parseFloat(quantity) || 0;
  const total = price ? qty * price : 0;
  const fee = total * 0.001;
  const position = positions.find(p => p.symbol === selectedSymbol);
  const canTrade = price !== null && price > 0 && qty > 0;

  const filteredAssets = useMemo(() => 
    ASSETS.filter(a => 
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [searchQuery]
  );

  const handleTrade = () => {
    if (!selectedSymbol || qty <= 0) {
      toast.warning('Invalid Trade', 'Please select an asset and enter a quantity');
      return;
    }

    if (!price || price <= 0) {
      toast.error('Price Unavailable', 'Cannot trade without real-time price data. Please wait or try again.');
      return;
    }

    if (mode === 'BUY') {
      if (total + fee > cashBalance) {
        toast.error('Insufficient Funds', `You need ${formatCurrency(total + fee)} but only have ${formatCurrency(cashBalance)}`);
        return;
      }
      const success = executeBuy(
        selectedSymbol, 
        qty, 
        price, 
        fee, 
        selectedAsset?.type as AssetType || 'stocks'
      );
      if (success) {
        toast.success('Trade Executed', `Bought ${qty} ${selectedSymbol} at ${formatCurrency(price)}`);
        setQuantity('');
      }
    } else {
      const owned = position?.quantity || 0;
      if (qty > owned) {
        toast.error('Insufficient Holdings', `You only own ${owned} units of ${selectedSymbol}`);
        return;
      }
      const success = executeSell(selectedSymbol, qty, price, fee);
      if (success) {
        toast.success('Trade Executed', `Sold ${qty} ${selectedSymbol} at ${formatCurrency(price)}`);
        setQuantity('');
      }
    }
  };

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-main mb-1">Paper Trading</h1>
        <p className="text-theme-muted">Practice trading with real-time prices</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Trade Form */}
        <div className="space-y-6">
          {/* Cash Balance Card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-slate-400">Available Cash</span>
            </div>
            <p className="text-4xl font-bold text-white">{formatCurrency(cashBalance)}</p>
          </div>

          {/* Asset Selection */}
          <div className="glass-card p-6">
            <label className="text-theme-main font-semibold mb-4 block">Select Asset</label>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stocks, forex, commodities..."
                className="w-full pl-12 pr-4 py-3 bg-theme-surface-2 border border-theme-soft rounded-xl text-theme-main placeholder:text-theme-muted focus:border-blueSmoke focus:ring-2 focus:ring-blueSmoke/20 transition-all"
              />
            </div>

            {/* Asset Grid */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isLoadingList && Object.keys(listPrices).length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-theme-accent animate-spin" />
                  <span className="ml-2 text-slate-400 text-sm">Loading prices...</span>
                </div>
              ) : filteredAssets.slice(0, 10).map((asset) => {
                  const assetPrice = listPrices[asset.symbol];
                  return (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      setSelectedSymbol(asset.symbol);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      selectedSymbol === asset.symbol
                        ? 'bg-mild border border-blueSmoke'
                        : 'bg-theme-surface-2 hover:bg-mild border border-theme-soft'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        asset.type === 'stocks' ? 'bg-blueSmoke/25' :
                        asset.type === 'forex' ? 'bg-limeSoft/30' :
                        asset.type === 'commodities' ? 'bg-amber-500/20' : 'bg-antiqueIvory'
                      }`}>
                        <span className={`text-xs font-bold ${
                          asset.type === 'stocks' ? 'text-blueSmoke' :
                          asset.type === 'forex' ? 'text-limeSoft' :
                          asset.type === 'commodities' ? 'text-amber-500' : 'text-theme-muted'
                        }`}>
                          {asset.symbol.slice(0, 3)}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-theme-main font-medium">{asset.symbol}</p>
                        <p className="text-slate-400 text-xs">{asset.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {assetPrice !== null && assetPrice !== undefined ? (
                        <span className="text-emerald-700 font-semibold">
                          {asset.type === 'forex' ? assetPrice.toFixed(4) : formatCurrency(assetPrice)}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">--</span>
                      )}
                    </div>
                  </button>
                  );
              })}
            </div>
          </div>

          {/* Selected Asset Info */}
          {selectedSymbol && (
            <div className={`p-5 rounded-xl border ${priceError ? 'border-red-500/50 bg-red-500/10' : 'gradient-border'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold text-theme-main">{selectedSymbol}</p>
                  <p className="text-slate-400 text-sm">{selectedAsset?.name}</p>
                  {position && (
                    <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      You own {position.quantity} units
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {isLoadingPrice ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                      <span className="text-slate-400">Loading...</span>
                    </div>
                  ) : priceError ? (
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Price Unavailable</span>
                    </div>
                  ) : price ? (
                    <>
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                        <p className="text-emerald-700 text-xs font-medium">Live Price</p>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700">
                        {selectedAsset?.type === 'forex' ? price.toFixed(4) : formatCurrency(price)}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
              {priceError && (
                <p className="text-red-400 text-sm mt-3">
                  Cannot fetch real-time price. Trading disabled for safety.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Right Column - Order Form */}
        <div className="space-y-6">
          {/* Buy/Sell Toggle */}
          <div className="glass-card p-2 flex gap-2">
            <button
              onClick={() => setMode('BUY')}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'BUY'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white glow-green'
                  : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-2'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              BUY
            </button>
            <button
              onClick={() => setMode('SELL')}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'SELL'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white glow-red'
                  : 'text-theme-muted hover:text-theme-main hover:bg-theme-surface-2'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              SELL
            </button>
          </div>

          {/* Quantity Input */}
          <div className="glass-card p-6">
            <label className="text-theme-main font-semibold mb-4 block">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-4 bg-theme-surface-2 border border-theme-soft rounded-xl text-theme-main text-center text-2xl font-bold focus:border-blueSmoke focus:ring-2 focus:ring-blueSmoke/20"
            />
            
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[1, 5, 10, 25].map(amt => (
                <button
                  key={amt}
                  onClick={() => setQuantity(amt.toString())}
                  className="py-2 rounded-lg bg-theme-surface-2 hover:bg-mild border border-theme-soft text-theme-main text-sm font-medium transition-all"
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Max button for selling */}
            {mode === 'SELL' && position && (
              <button
                onClick={() => setQuantity(position.quantity.toString())}
                className="w-full mt-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-all"
              >
                Sell All ({position.quantity})
              </button>
            )}
          </div>

          {/* Order Summary */}
          {qty > 0 && price && price > 0 && (
            <div className="glass-card p-6">
              <p className="text-slate-400 text-sm mb-4">Order Summary</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">{qty} × {formatCurrency(price)}</span>
                  <span className="text-theme-main">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee (0.1%)</span>
                  <span className="text-theme-main">{formatCurrency(fee)}</span>
                </div>
                <div className="h-px bg-theme-surface-2 border-t border-theme-soft" />
                <div className="flex justify-between">
                  <span className="text-theme-main font-semibold">Total</span>
                  <span className="text-xl font-bold text-theme-main">
                    {formatCurrency(mode === 'BUY' ? total + fee : total - fee)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleTrade}
            disabled={!canTrade || isLoadingPrice || priceError}
            className={`w-full py-5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              canTrade && !isLoadingPrice && !priceError
                ? mode === 'BUY'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30'
                : 'bg-theme-surface-2 border border-theme-soft text-theme-muted cursor-not-allowed'
            }`}
          >
            <Zap className="w-5 h-5" />
            {!selectedSymbol 
              ? 'Select an Asset' 
              : isLoadingPrice
                ? 'Fetching Price...'
                : priceError
                  ? 'Price Unavailable'
                  : qty <= 0 
                    ? 'Enter Quantity' 
                    : `${mode} ${qty} ${selectedSymbol}`
            }
          </button>

          {/* Positions */}
          {positions.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-theme-main font-semibold mb-4">Your Positions</h3>
              <div className="space-y-2">
                {positions.map((p) => {
                  // Use position's current_value which is updated by central PriceUpdater
                  return (
                    <button
                      key={p.symbol}
                      onClick={() => {
                        setSelectedSymbol(p.symbol);
                        setMode('SELL');
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="text-left">
                        <p className="text-theme-main font-medium">{p.symbol}</p>
                        <p className="text-slate-400 text-xs">{p.quantity} units @ {formatCurrency(p.avg_cost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-theme-main">{formatCurrency(p.current_value)}</p>
                        <p className={`text-xs flex items-center gap-1 justify-end ${
                          p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {p.pnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {formatCurrency(Math.abs(p.pnl))} ({p.pnl_percent.toFixed(1)}%)
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
