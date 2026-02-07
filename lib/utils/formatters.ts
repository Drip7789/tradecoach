// Formatting Utilities for BiasCoach

/**
 * Format a number as currency
 */
export const formatCurrency = (
  value: number,
  options: {
    currency?: string;
    showSign?: boolean;
    compact?: boolean;
  } = {}
): string => {
  const { currency = 'USD', showSign = false, compact = false } = options;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  });

  const formatted = formatter.format(Math.abs(value));

  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
};

/**
 * Format a number with compact notation (e.g., 1.2M, 500K)
 */
export const formatCompact = (value: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return formatter.format(value);
};

/**
 * Format a percentage
 */
export const formatPercent = (
  value: number,
  options: { showSign?: boolean; decimals?: number } = {}
): string => {
  const { showSign = false, decimals = 1 } = options;
  const formatted = `${Math.abs(value).toFixed(decimals)}%`;

  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
};

/**
 * Format a date relative to now (e.g., "2 hours ago", "yesterday")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return formatDate(date, 'short');
};

/**
 * Format a date
 */
export const formatDate = (
  date: string | Date,
  style: 'full' | 'long' | 'short' | 'time' = 'short'
): string => {
  const d = new Date(date);

  const options: Intl.DateTimeFormatOptions = {
    full: { dateStyle: 'full', timeStyle: 'short' },
    long: { dateStyle: 'long', timeStyle: 'short' },
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
  }[style];

  return d.toLocaleDateString('en-US', options);
};

/**
 * Format a timestamp for trade display
 */
export const formatTradeTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) return `Today ${timeStr}`;
  if (isYesterday) return `Yesterday ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a quantity
 */
export const formatQuantity = (quantity: number, symbol: string): string => {
  const isForex = symbol.includes('/');
  
  if (isForex) {
    return quantity.toLocaleString('en-US');
  }

  // Stocks are typically whole numbers
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }
  return quantity.toFixed(2);
};

/**
 * Format discipline score with label
 */
export const formatDisciplineScore = (score: number): { score: string; label: string } => {
  const label = 
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Needs Work' :
    'Poor';

  return { score: Math.round(score).toString(), label };
};

/**
 * Format a number with thousands separators
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export default {
  formatCurrency,
  formatCompact,
  formatPercent,
  formatRelativeTime,
  formatDate,
  formatTradeTimestamp,
  formatQuantity,
  formatDisciplineScore,
  formatNumber,
};

