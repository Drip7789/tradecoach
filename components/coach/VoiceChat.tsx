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

export default function VoiceChat({ onTranscript, onResponse }: VoiceChatProps) {
  const { trades, positions, disciplineScore } = usePortfolioStore();
  const analysis = analyzeBiases(trades, positions);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Build trading context to send to API
  const buildTradingContext = useCallback(() => {
    const winners = trades.filter(t => (t.pnl || 0) > 0);
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0;

    return {
      trades: trades.slice(0, 10), // Last 10 trades
      biases: analysis.biases.map(b => ({
        bias_type: b.bias_type,
        score: b.score,
        severity: b.severity,
        intervention: b.intervention,
      })),
      disciplineScore: analysis.disciplineScore,
      totalTrades: trades.length,
      winRate,
      totalPnL,
    };
  }, [trades, analysis]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000, // Gradium requires 24kHz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        await sendAudioToBackend();
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Please allow microphone access to use voice chat.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const sendAudioToBackend = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'question.webm');
      formData.append('tradingContext', JSON.stringify(buildTradingContext()));

      // Send to backend
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Voice chat request failed');
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
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
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
            "What's my discipline score?",
          ].map((question, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTranscript(question);
                // Could auto-trigger if we had text input
              }}
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

