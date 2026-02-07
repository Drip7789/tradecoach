// BiasCoach Type Definitions

// ============================================
// Core Entity Types
// ============================================

export interface User {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
}

export interface Session {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'archived';
  starting_balance: number;
  current_balance: number;
}

export interface Trade {
  id: string;
  session_id: string;
  user_id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_value: number;
  fees: number;
  timestamp: string;
  asset_type: AssetType;
  notes?: string;
  pnl?: number; // Realized P&L (for SELL trades)
}

export type AssetType = 'stocks' | 'forex' | 'commodities' | 'etfs' | 'cash';

export interface Position {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  current_value: number;
  pnl: number;
  pnl_percent: number;
  asset_type: AssetType;
}

export interface Portfolio {
  session_id: string;
  total_value: number;
  cash_balance: number;
  positions: Position[];
  asset_allocation: AssetAllocation[];
  total_pnl: number;
  total_pnl_percent: number;
}

export interface AssetAllocation {
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  asset_type: AssetType;
}

// ============================================
// Bias Detection Types
// ============================================

export type BiasType =
  | 'overtrading'
  | 'loss_aversion'
  | 'revenge_trading'
  | 'disposition_effect'
  | 'risk_escalation'
  | 'overconfidence'
  | 'concentration_bias'
  | 'fee_drag'
  | 'churn';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface BiasDetection {
  id: string;
  session_id: string;
  bias_type: BiasType;
  score: number;
  severity: Severity;
  evidence: BiasEvidence;
  metrics: Record<string, number | string>;
  affected_trades: string[];
  intervention: string;
  explanation: string;
  detected_at: string;
}

export interface BiasEvidence {
  summary: string;
  key_metrics: Record<string, number>;
  timestamps: string[];
}

// ============================================
// Discipline Score Types
// ============================================

export interface DisciplineScore {
  session_id: string;
  total_score: number;
  components: DisciplineComponent[];
  calculated_at: string;
}

export interface DisciplineComponent {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  description: string;
}

export type DisciplineLevel = 'excellent' | 'good' | 'warning' | 'poor';

// ============================================
// Analysis Report Types
// ============================================

export interface AnalysisReport {
  session_id: string;
  discipline_score: DisciplineScore;
  bias_detections: BiasDetection[];
  trade_summary: TradeSummary;
  generated_at: string;
}

export interface TradeSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_trade_size: number;
  avg_hold_time: number;
  date_range: {
    start: string;
    end: string;
  };
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referenced_biases?: BiasType[];
  referenced_trades?: string[];
}

export interface ChatContext {
  session_id: string;
  bias_detections: BiasDetection[];
  discipline_score: DisciplineScore;
  recent_trades: Trade[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  status_code: number;
}

// ============================================
// UI State Types
// ============================================

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
}

export interface TradeFormData {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
}

// ============================================
// Price Types
// ============================================

export interface AssetPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  timestamp: string;
  source: 'yahoo' | 'fallback';
  assetType: AssetType;
}

