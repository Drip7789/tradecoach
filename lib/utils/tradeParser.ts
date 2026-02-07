// Trade Data Parser for CSV/Excel files
// Parses trading history in the National Bank challenge format:
// timestamp, asset, side, quantity, entry_price, exit_price, profit_loss, balance

import { Trade, AssetType } from '@/types';

interface RawTradeRow {
  timestamp: string;
  asset: string;
  side: string;
  quantity: string | number;
  entry_price: string | number;
  exit_price: string | number;
  profit_loss: string | number;
  balance: string | number;
}

interface ParseResult {
  trades: Trade[];
  errors: string[];
  totalRows: number;
  successfulRows: number;
}

// Determine asset type from symbol
function getAssetType(symbol: string): AssetType {
  const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD', 'USDCHF', 'EURGBP', 'GBPJPY', 'EURJPY', 'NZDUSD'];
  const commodities = ['GOLD', 'SILVER', 'OIL', 'XAUUSD', 'XAGUSD'];
  const etfs = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO'];
  
  const normalized = symbol.toUpperCase().replace(/[\/\-]/g, '');
  
  if (forexPairs.some(pair => normalized.includes(pair) || pair.includes(normalized))) {
    return 'forex';
  }
  if (commodities.some(c => normalized.includes(c))) {
    return 'commodities';
  }
  if (etfs.includes(normalized)) {
    return 'etfs';
  }
  return 'stocks';
}

// Convert Excel serial date to JavaScript Date
function excelSerialToDate(serial: number): Date {
  // Excel's epoch is December 30, 1899
  // But there's a leap year bug where Excel thinks 1900 was a leap year
  const excelEpoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const fraction = serial - days;
  
  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Add time from the fractional part
  const totalSeconds = Math.round(fraction * 24 * 60 * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  date.setHours(hours, minutes, seconds, 0);
  
  return date;
}

// Parse timestamp from various formats
function parseTimestamp(raw: string): Date | null {
  if (!raw || raw.trim() === '') return null;
  
  const trimmed = raw.trim();
  
  // Check if it's an Excel serial number (like 45352.395833)
  const numericValue = parseFloat(trimmed);
  if (!isNaN(numericValue) && numericValue > 25000 && numericValue < 60000) {
    // Looks like an Excel date serial (range roughly 1968-2064)
    return excelSerialToDate(numericValue);
  }
  
  // Try various date formats
  
  // ISO format: 2025-03-01T09:30:00
  if (trimmed.includes('T')) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: 2025-03-01 9:30
  if (trimmed.includes('-') && trimmed.includes(' ')) {
    const normalized = trimmed.replace(' ', 'T');
    // Add seconds if missing
    const parts = normalized.split('T')[1]?.split(':');
    const withSeconds = parts?.length === 2 ? normalized + ':00' : normalized;
    const date = new Date(withSeconds);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: MM/DD/YYYY HH:MM
  if (trimmed.includes('/')) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Just a date without time: 2025-03-01
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + 'T12:00:00');
    if (!isNaN(date.getTime())) return date;
  }
  
  // Last resort: try native parsing
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  
  return null;
}

// Parse a single row
function parseRow(row: RawTradeRow, index: number, baseTime: number): { trade: Trade | null; error: string | null } {
  try {
    // Parse timestamp
    const timestamp = row.timestamp?.toString();
    const date = parseTimestamp(timestamp);
    
    if (!date) {
      return { trade: null, error: `Row ${index + 1}: Invalid timestamp "${timestamp}"` };
    }
    const isoTimestamp = date.toISOString();

    // Parse asset symbol
    const symbol = row.asset?.toString().trim().toUpperCase();
    if (!symbol) {
      return { trade: null, error: `Row ${index + 1}: Missing asset symbol` };
    }

    // Parse side (BUY/SELL)
    const sideRaw = row.side?.toString().trim().toUpperCase();
    if (sideRaw !== 'BUY' && sideRaw !== 'SELL') {
      return { trade: null, error: `Row ${index + 1}: Invalid side "${row.side}" (must be BUY or SELL)` };
    }
    const action: 'BUY' | 'SELL' = sideRaw;

    // Parse quantity
    const quantity = parseFloat(row.quantity?.toString() || '0');
    if (isNaN(quantity) || quantity <= 0) {
      return { trade: null, error: `Row ${index + 1}: Invalid quantity "${row.quantity}"` };
    }

    // Parse prices
    const entryPrice = parseFloat(row.entry_price?.toString() || '0');
    const exitPrice = parseFloat(row.exit_price?.toString() || '0');
    
    if (isNaN(entryPrice) || entryPrice <= 0) {
      return { trade: null, error: `Row ${index + 1}: Invalid entry_price "${row.entry_price}"` };
    }

    // Determine trade price based on action
    // For BUY: price = entry_price
    // For SELL: price = exit_price
    const price = action === 'BUY' ? entryPrice : (exitPrice > 0 ? exitPrice : entryPrice);

    // Parse P&L - this is important for bias detection!
    const pnl = parseFloat(row.profit_loss?.toString() || '0');

    // Calculate total value based on entry price (for complete trades)
    const totalValue = quantity * entryPrice;
    const fees = totalValue * 0.001; // Assume 0.1% fee

    // Generate unique ID using baseTime + index to ensure uniqueness
    const trade: Trade = {
      id: `import-${baseTime}-${index}`,
      session_id: 'imported-session',
      user_id: 'imported-user',
      symbol,
      action,
      quantity,
      price: entryPrice, // Use entry price as the trade price
      total_value: totalValue,
      fees,
      timestamp: isoTimestamp,
      asset_type: getAssetType(symbol),
      // IMPORTANT: Include pnl for ALL trades (needed for bias detection)
      // This is the realized P&L from the complete round-trip trade
      pnl: !isNaN(pnl) ? pnl : 0,
    };

    return { trade, error: null };
  } catch (err) {
    return { trade: null, error: `Row ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// Normalize header names to expected format
function normalizeHeaders(headers: string[]): string[] {
  const headerMap: Record<string, string> = {
    'timestamp': 'timestamp',
    'time': 'timestamp',
    'date': 'timestamp',
    'datetime': 'timestamp',
    'date_time': 'timestamp',
    'asset': 'asset',
    'symbol': 'asset',
    'ticker': 'asset',
    'instrument': 'asset',
    'side': 'side',
    'action': 'side',
    'type': 'side',
    'direction': 'side',
    'buy_sell': 'side',
    'quantity': 'quantity',
    'qty': 'quantity',
    'amount': 'quantity',
    'size': 'quantity',
    'volume': 'quantity',
    'entry_price': 'entry_price',
    'entry': 'entry_price',
    'open_price': 'entry_price',
    'price': 'entry_price',
    'exit_price': 'exit_price',
    'exit': 'exit_price',
    'close_price': 'exit_price',
    'profit_loss': 'profit_loss',
    'pnl': 'profit_loss',
    'p&l': 'profit_loss',
    'profit': 'profit_loss',
    'pl': 'profit_loss',
    'realized_pnl': 'profit_loss',
    'balance': 'balance',
    'account_balance': 'balance',
  };

  return headers.map(h => {
    const normalized = h.toLowerCase().trim().replace(/[\s-]/g, '_');
    return headerMap[normalized] || normalized;
  });
}

// Parse CSV text content
export function parseCSV(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    return { trades: [], errors: ['File is empty or has no data rows'], totalRows: 0, successfulRows: 0 };
  }

  // Parse headers (first line)
  const rawHeaders = lines[0].split(/[\t,]/).map(h => h.trim());
  const headers = normalizeHeaders(rawHeaders);
  
  console.log('Parsed headers:', headers);
  console.log('Raw headers:', rawHeaders);
  
  // Check for required columns
  const requiredColumns = ['timestamp', 'asset', 'side', 'quantity', 'entry_price'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    return { 
      trades: [], 
      errors: [`Missing required columns: ${missingColumns.join(', ')}. Found columns: ${rawHeaders.join(', ')}`],
      totalRows: lines.length - 1,
      successfulRows: 0 
    };
  }

  const trades: Trade[] = [];
  const errors: string[] = [];
  
  // Use a single base time for all trade IDs in this import
  const baseTime = Date.now();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tab or comma
    const values = line.split(/[\t,]/).map(v => v.trim());
    
    // Create row object
    const row: RawTradeRow = {
      timestamp: '',
      asset: '',
      side: '',
      quantity: '',
      entry_price: '',
      exit_price: '',
      profit_loss: '',
      balance: '',
    };

    headers.forEach((header, idx) => {
      if (header in row) {
        (row as Record<string, string | number>)[header] = values[idx] || '';
      }
    });

    const { trade, error } = parseRow(row, i, baseTime);
    
    if (trade) {
      trades.push(trade);
    }
    if (error) {
      errors.push(error);
    }
  }

  console.log(`Parsed ${trades.length} trades successfully, ${errors.length} errors`);
  if (trades.length > 0) {
    console.log('First trade:', trades[0]);
    console.log('Last trade:', trades[trades.length - 1]);
  }

  return {
    trades,
    errors: errors.slice(0, 10), // Limit errors shown
    totalRows: lines.length - 1,
    successfulRows: trades.length,
  };
}

// Export trades to CSV format
export function exportToCSV(trades: Trade[]): string {
  const headers = ['timestamp', 'asset', 'side', 'quantity', 'entry_price', 'exit_price', 'profit_loss', 'balance'];
  
  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate running balance starting from typical initial balance
  let balance = 100000;
  
  const rows = sortedTrades.map(trade => {
    const pnl = trade.pnl || 0;
    balance += pnl - trade.fees;
    
    // For BUY trades, exit_price is not applicable (0 or same as entry)
    // For SELL trades, we use the trade price as exit
    const entryPrice = trade.action === 'BUY' ? trade.price : (trade.total_value / trade.quantity - Math.abs(pnl) / trade.quantity);
    const exitPrice = trade.action === 'SELL' ? trade.price : 0;
    
    return [
      trade.timestamp.replace('T', ' ').split('.')[0], // Format timestamp
      trade.symbol,
      trade.action,
      trade.quantity,
      entryPrice.toFixed(2),
      exitPrice > 0 ? exitPrice.toFixed(2) : '',
      pnl.toFixed(2),
      balance.toFixed(2),
    ].join('\t');
  });

  return [headers.join('\t'), ...rows].join('\n');
}

// Helper to download CSV as file
export function downloadCSV(trades: Trade[], filename: string = 'trading_history.csv'): void {
  const csv = exportToCSV(trades);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
