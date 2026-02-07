'use client';

import { useState, useCallback, useRef } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { parseCSV, downloadCSV } from '@/lib/utils/tradeParser';
import { analyzeBiases, BiasAnalysisResult } from '@/lib/services/biasDetector';
import { getBiasDefinition } from '@/constants/biasDefinitions';
import { getSeverityColor, getScoreColor } from '@/constants/colors';
import { Trade } from '@/types';
import { toast } from '@/components/shared/Toast';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  X,
  Download,
  FileText,
  Loader2,
  Brain,
  ChevronRight,
  BarChart3,
  Clock,
  TrendingUp,
  AlertTriangle,
  Shield,
  LineChart,
} from 'lucide-react';
import {
  CumulativePnLChart,
  WinLossChart,
  TradingFrequencyChart,
  BiasRadarChart,
  TradeSizeChart,
  AssetPnLChart,
  DrawdownChart,
  StreakChart,
} from '@/components/charts/TradeCharts';

interface UploadStats {
  totalRows: number;
  successfulRows: number;
  errors: string[];
}

export default function TradeHistoryUpload() {
  const { trades } = usePortfolioStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [importedTrades, setImportedTrades] = useState<Trade[]>([]);
  const [analysisResult, setAnalysisResult] = useState<BiasAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadStats(null);
    setAnalysisResult(null);

    try {
      // Check file type
      const validTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const isValidType = validTypes.includes(file.type) || 
        file.name.endsWith('.csv') || 
        file.name.endsWith('.txt') ||
        file.name.endsWith('.tsv');
      
      if (!isValidType) {
        toast.error('Invalid File', 'Please upload a CSV or text file');
        setIsProcessing(false);
        return;
      }

      // Read file content
      const content = await file.text();
      
      // Parse CSV
      const result = parseCSV(content);
      
      setUploadStats({
        totalRows: result.totalRows,
        successfulRows: result.successfulRows,
        errors: result.errors,
      });

      if (result.trades.length > 0) {
        setImportedTrades(result.trades);
        
        // Run bias analysis on imported trades
        const analysis = analyzeBiases(result.trades, []);
        setAnalysisResult(analysis);
        
        toast.success(
          'Analysis Complete', 
          `Analyzed ${result.trades.length} trades from ${file.name}`
        );
      } else {
        toast.error('Import Failed', 'No valid trades found in file');
      }
    } catch (err) {
      toast.error('Parse Error', err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const handleExport = useCallback(() => {
    if (trades.length === 0) {
      toast.warning('No Trades', 'No paper trades to export yet');
      return;
    }
    downloadCSV(trades, `biascoach_trades_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export Complete', `Downloaded ${trades.length} trades`);
  }, [trades]);

  const handleClearAnalysis = useCallback(() => {
    setImportedTrades([]);
    setAnalysisResult(null);
    setUploadStats(null);
  }, []);

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative glass-card p-6 border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="text-center">
          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 mx-auto mb-3 text-indigo-400 animate-spin" />
              <p className="text-white font-medium">Analyzing trading history...</p>
            </>
          ) : (
            <>
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-indigo-400' : 'text-slate-400'}`} />
              <p className="text-white font-medium mb-1">
                {isDragging ? 'Drop to analyze' : 'Upload Trading History for Analysis'}
              </p>
              <p className="text-slate-400 text-sm">
                Drag & drop a CSV file or click to browse
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Format: timestamp, asset, side, quantity, entry_price, exit_price, profit_loss, balance
              </p>
            </>
          )}
        </div>
      </div>

      {/* Upload Stats */}
      {uploadStats && !analysisResult && (
        <div className={`glass-card p-4 ${uploadStats.errors.length > 0 ? 'border border-amber-500/30' : 'border border-emerald-500/30'}`}>
          <div className="flex items-center gap-3 mb-3">
            {uploadStats.errors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <p className="text-white font-medium">
                {uploadStats.successfulRows} of {uploadStats.totalRows} rows parsed
              </p>
            </div>
          </div>
          
          {uploadStats.errors.length > 0 && (
            <div className="bg-amber-500/10 rounded-lg p-3 max-h-32 overflow-y-auto">
              {uploadStats.errors.map((error, idx) => (
                <p key={idx} className="text-amber-300 text-xs mb-1">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis Results (Inline - Separate from Paper Trading) */}
      {analysisResult && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Uploaded Data Analysis</h3>
                <p className="text-slate-400 text-sm">{importedTrades.length} trades analyzed</p>
              </div>
            </div>
            <button
              onClick={handleClearAnalysis}
              className="text-slate-400 hover:text-white transition-colors p-2"
              title="Clear analysis"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Discipline Score */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-6">
              {/* Score Circle */}
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ 
                    background: `conic-gradient(${getScoreColor(analysisResult.disciplineScore)} ${analysisResult.disciplineScore * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                  }}
                >
                  <div className="w-20 h-20 rounded-full bg-background-primary flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{analysisResult.disciplineScore}</span>
                    <span className="text-slate-400 text-xs">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Score Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-lg font-semibold text-white">Discipline Score</h4>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${getScoreColor(analysisResult.disciplineScore)}20`, color: getScoreColor(analysisResult.disciplineScore) }}
                  >
                    {getScoreLabel(analysisResult.disciplineScore)}
                  </span>
                </div>
                
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-slate-300">{analysisResult.summary.criticalBiases} critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-300">{analysisResult.summary.highBiases} high</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">{9 - analysisResult.summary.criticalBiases - analysisResult.summary.highBiases} healthy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4 text-center">
              <BarChart3 className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{importedTrades.length}</p>
              <p className="text-slate-400 text-xs">Total Trades</p>
            </div>
            <div className="glass-card p-4 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-emerald-400">
                {importedTrades.filter(t => (t.pnl || 0) > 0).length}
              </p>
              <p className="text-slate-400 text-xs">Winning</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Clock className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">
                {new Set(importedTrades.map(t => t.timestamp.split('T')[0])).size}
              </p>
              <p className="text-slate-400 text-xs">Trading Days</p>
            </div>
          </div>

          {/* Graphical Insights for Uploaded Data */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <LineChart className="w-4 h-4 text-indigo-400" />
              Graphical Insights
            </h4>
            
            {/* Row 1: Main Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <CumulativePnLChart trades={importedTrades} height={180} />
              <BiasRadarChart analysis={analysisResult} height={220} />
            </div>
            
            {/* Row 2: Distribution & Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <WinLossChart trades={importedTrades} height={160} />
              <TradingFrequencyChart trades={importedTrades} height={160} />
              <AssetPnLChart trades={importedTrades} height={160} />
            </div>
            
            {/* Row 3: Risk Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <DrawdownChart trades={importedTrades} height={160} />
              <StreakChart trades={importedTrades} height={140} />
            </div>
          </div>

          {/* Detected Biases */}
          {analysisResult.biases.filter(b => b.score > 20).length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Detected Behavioral Patterns
              </h4>
              
              {analysisResult.biases.filter(b => b.score > 20).slice(0, 5).map((bias) => {
                const definition = getBiasDefinition(bias.bias_type);
                const severityColor = getSeverityColor(bias.severity);
                
                return (
                  <div key={bias.id} className="glass-card p-4">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${severityColor}15` }}
                      >
                        {definition.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h5 className="text-white font-medium">{definition.name}</h5>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
                            style={{ backgroundColor: `${severityColor}20`, color: severityColor }}
                          >
                            {bias.severity}
                          </span>
                          <span className="text-slate-400 text-sm ml-auto">{bias.score}%</span>
                        </div>
                        
                        <p className="text-slate-400 text-sm mb-3">{bias.intervention}</p>
                        
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${bias.score}%`, backgroundColor: severityColor }}
                          />
                        </div>
                        
                        {/* Quick Suggestion */}
                        <div className="mt-3 flex items-start gap-2 text-slate-300 text-xs">
                          <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                          {definition.interventions[0]}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-white mb-1">Looking Great!</h4>
              <p className="text-slate-400 text-sm">No significant behavioral biases detected in this trading history.</p>
            </div>
          )}
        </div>
      )}

      {/* Export Paper Trades Button */}
      <button
        onClick={handleExport}
        disabled={trades.length === 0}
        className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
          trades.length > 0
            ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
            : 'bg-white/5 text-slate-500 cursor-not-allowed'
        }`}
      >
        <Download className="w-4 h-4" />
        Export My Paper Trades ({trades.length})
      </button>

      {/* Info Note */}
      <p className="text-slate-500 text-xs text-center">
        <FileText className="w-3 h-3 inline mr-1" />
        Uploaded data is analyzed separately and does not affect your paper trading portfolio.
      </p>
    </div>
  );
}
