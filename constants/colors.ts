// BiasCoach Color System

export const colors = {
  // Brand colors - Deep navy and vibrant accents
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main brand color
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  // Severity levels for bias detection
  severity: {
    low: '#FCD34D',      // Warm yellow
    medium: '#FB923C',   // Orange
    high: '#EF4444',     // Red
    critical: '#DC2626', // Dark red
  },

  // Discipline score gradient
  score: {
    excellent: '#10B981', // Emerald (80-100)
    good: '#3B82F6',      // Blue (60-79)
    warning: '#F59E0B',   // Amber (40-59)
    poor: '#EF4444',      // Red (0-39)
  },

  // Asset type colors for portfolio chart
  assets: {
    stocks: '#3B82F6',     // Blue
    commodities: '#10B981', // Emerald
    forex: '#8B5CF6',      // Purple
    etfs: '#F59E0B',       // Amber
  },

  // P&L indicators
  pnl: {
    profit: '#10B981',    // Green
    loss: '#EF4444',      // Red
    neutral: '#6B7280',   // Gray
  },

  // UI colors
  background: {
    primary: '#0F172A',   // Dark navy
    secondary: '#1E293B', // Lighter navy
    tertiary: '#334155',  // Even lighter
    card: '#1E293B',
  },

  text: {
    primary: '#F8FAFC',     // Light text for dark mode
    secondary: '#94A3B8',
    tertiary: '#64748B',
    inverse: '#0F172A',     // Dark text for light surfaces
  },

  // Chart palette for multiple segments
  chartPalette: [
    '#6366F1', // Indigo
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ],
};

// Helper function to get severity color
export const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical'): string => {
  return colors.severity[severity];
};

// Helper function to get score color based on value
export const getScoreColor = (score: number): string => {
  if (score >= 80) return colors.score.excellent;
  if (score >= 60) return colors.score.good;
  if (score >= 40) return colors.score.warning;
  return colors.score.poor;
};

// Helper function to get score level
export const getScoreLevel = (score: number): 'excellent' | 'good' | 'warning' | 'poor' => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'poor';
};

// Get chart color by index (cycles through palette)
export const getChartColor = (index: number): string => {
  return colors.chartPalette[index % colors.chartPalette.length];
};

export default colors;

