'use client';

import { useState, useRef, useCallback } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { analyzeBiases } from '@/lib/services/biasDetector';
import { 
  Mic, 
  Square, 
  Volume2, 
  Loader2,
  AlertCircle,
  Waves,
} from 'lucide-react';

interface VoiceChatProps {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
}

// Helper to create WAV file from audio samples
function createWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  // Convert Float32 to Int16
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

export default function VoiceChat({ onTranscript, onResponse }: VoiceChatProps) {
  const { trades, positions, cashBalance, totalValue, totalPnl, totalPnlPercent } = usePortfolioStore();
  const analysis = analyzeBiases(trades, positions);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Build trading context to send to API - includes ALL portfolio info
  const buildTradingContext = useCallback(() => {
    const winners = trades.filter(t => (t.pnl || 0) > 0);
    const losers = trades.filter(t => (t.pnl || 0) < 0);
    const realizedPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0;

    return {
      // Portfolio overview
      cashBalance,
      totalPortfolioValue: totalValue,
      unrealizedPnL: totalPnl,
      unrealizedPnLPercent: totalPnlPercent,
      realizedPnL,
      
      // Current positions
      positions: positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        avgCost: p.avg_cost,
        currentPrice: p.current_price,
        currentValue: p.current_value,
        pnl: p.pnl,
        pnlPercent: p.pnl_percent,
        assetType: p.asset_type,
      })),
      
      // Trade history
      trades: trades.slice(0, 10).map(t => ({
        id: t.id,
        symbol: t.symbol,
        action: t.action,
        quantity: t.quantity,
        price: t.price,
        pnl: t.pnl,
        timestamp: t.timestamp,
      })),
      
      // Bias analysis
      biases: analysis.biases.map(b => ({
        bias_type: b.bias_type,
        score: b.score,
        severity: b.severity,
        intervention: b.intervention,
      })),
      disciplineScore: analysis.disciplineScore,
      
      // Statistics
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate,
    };
  }, [trades, positions, analysis, cashBalance, totalValue, totalPnl, totalPnlPercent]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      // Request microphone permission with 16kHz (faster, smaller files)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Create AudioContext for raw PCM capture at 16kHz (smaller files, faster)
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode to capture raw samples
      // Smaller buffer = lower latency
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the samples (they get reused)
        audioChunksRef.current.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      console.log('🎙️ Recording at', audioContext.sampleRate, 'Hz');

    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Please allow microphone access to use voice chat.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    
    // Cleanup audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Now process the audio
    await sendAudioToBackend();
  }, [isRecording]);

  const sendAudioToBackend = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Combine all audio chunks into a single Float32Array
      const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunksRef.current) {
        combinedSamples.set(chunk, offset);
        offset += chunk.length;
      }
      
      const durationSecs = (totalLength / 16000).toFixed(1);
      console.log(`🎤 Recorded ${durationSecs}s of audio`);
      
      // Create WAV blob at 16kHz (33% smaller than 24kHz)
      const audioBlob = createWavBlob(combinedSamples, 16000);
      console.log(`📦 WAV size: ${(audioBlob.size / 1024).toFixed(1)}KB`);

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'question.wav');
      formData.append('tradingContext', JSON.stringify(buildTradingContext()));

      // Send to backend
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Speech transcription failed: ${response.status}`);
      }

      // Get transcript and response text from headers
      const transcriptText = decodeURIComponent(response.headers.get('X-Transcript') || '');
      const responseTextHeader = decodeURIComponent(response.headers.get('X-Response-Text') || '');

      if (transcriptText) {
        setTranscript(transcriptText);
        onTranscript?.(transcriptText);
      }
      if (responseTextHeader) {
        setResponseText(responseTextHeader);
        onResponse?.(responseTextHeader);
      }

      // Get audio response
      const audioBuffer = await response.arrayBuffer();
      const responseBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(responseBlob);

      // Play audio response
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        setIsPlaying(true);
        await audioRef.current.play();
      }

    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err instanceof Error ? err.message : 'Voice chat failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [buildTradingContext, onTranscript, onResponse]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main Voice Button */}
      <div className="relative">
        {/* Animated rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <div className="absolute inset-[-8px] rounded-full border-2 border-red-500/30 animate-pulse" />
          </>
        )}
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute inset-[-8px] rounded-full border-2 border-indigo-500/50 animate-pulse" />
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            relative z-10 w-20 h-20 rounded-full transition-all duration-300
            flex items-center justify-center
            ${isRecording 
              ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/40 scale-110' 
              : isProcessing
                ? 'bg-slate-700 cursor-wait'
                : isPlaying
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105'
            }
            disabled:opacity-70 disabled:cursor-not-allowed
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="w-7 h-7 text-white" />
          ) : isPlaying ? (
            <Waves className="w-8 h-8 text-white animate-pulse" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>

      {/* Status Text */}
      <p className="text-sm text-slate-400 text-center min-h-[20px]">
        {isRecording 
          ? '🎙️ Listening... Tap to stop'
          : isProcessing 
            ? '🤔 Thinking...'
            : isPlaying
              ? '🔊 Speaking...'
              : '🎤 Tap to ask your coach'
        }
      </p>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm max-w-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Last Transcript */}
      {transcript && !isRecording && !isProcessing && (
        <div className="w-full max-w-sm p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-slate-500 mb-1">You asked:</p>
          <p className="text-white text-sm">{transcript}</p>
        </div>
      )}

      {/* Last Response */}
      {responseText && !isRecording && !isProcessing && !isPlaying && (
        <div className="w-full max-w-sm p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Volume2 className="w-3 h-3 text-indigo-400" />
            <p className="text-xs text-indigo-400">Coach said:</p>
          </div>
          <p className="text-white text-sm">{responseText}</p>
        </div>
      )}

      {/* Hidden audio player */}
      <audio 
        ref={audioRef} 
        className="hidden" 
        onEnded={handleAudioEnded}
        onError={() => {
          setIsPlaying(false);
          setError('Failed to play audio response');
        }}
      />

      {/* Example Questions */}
      <div className="w-full max-w-sm pt-4 border-t border-white/5">
        <p className="text-xs text-slate-500 mb-2 text-center">Try asking:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "What's my biggest bias?",
            "How can I improve?",
            "What's my cash balance?",
          ].map((question, idx) => (
            <button
              key={idx}
              className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-full transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
