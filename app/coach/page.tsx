'use client';

import { useState, useMemo } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import useBehaviorReport from '@/hooks/useBehaviorReport';
import { buildCoachContext } from '@/lib/services/coachContext';
import { 
  MessageCircle, 
  Send, 
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  Mic,
  Keyboard,
  Loader2,
} from 'lucide-react';
import VoiceChat from '@/components/coach/VoiceChat';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
}

export default function CoachPage() {
  const { trades, positions, cashBalance, totalValue, totalPnl, totalPnlPercent } = usePortfolioStore();
  const { report } = useBehaviorReport();
  const disciplineScore = report?.disciplineScore ?? 100;
  const biasCount = report?.biases.length ?? 0;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'coach',
      content: getWelcomeMessage(disciplineScore, biasCount, trades.length),
    },
  ]);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<'voice' | 'text'>('voice');
  const [isLoading, setIsLoading] = useState(false);

  function getWelcomeMessage(score: number, biasCount: number, tradeCount: number): string {
    if (tradeCount < 3) {
      return "Hey there! 👋 I'm your AI trading coach. Start making some paper trades and I'll help you identify patterns in your behavior and build better trading discipline. You need at least 3 trades before I can analyze your patterns!";
    }
    if (score >= 80) {
      return "Impressive discipline! 🌟 Your trading patterns show excellent self-control. Let's discuss strategies to maintain this level of performance.";
    }
    if (score >= 60) {
      return `Good progress! You're at ${score} discipline points. I've noticed ${biasCount} patterns we could work on together. What would you like to explore?`;
    }
    return `I see some areas where we can improve together. Your discipline score is ${score}, but don't worry - that's exactly why I'm here! Let's work on building better habits.`;
  }

  const tradingContext = useMemo(() => {
    return buildCoachContext({
      report,
      trades,
      positions,
      cashBalance,
      totalValue,
      totalPnl,
      totalPnlPercent,
      tradeLimit: 15,
    });
  }, [report, trades, positions, cashBalance, totalValue, totalPnl, totalPnlPercent]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Call the chat API with trading context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          tradingContext,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const coachMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: data.response || "I'm having trouble responding right now. Please try again!",
      };
      setMessages(prev => [...prev, coachMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment! 🔄",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick suggestions
  const suggestions = [
    { icon: Brain, text: "What are my biases?" },
    { icon: Target, text: "How's my discipline?" },
    { icon: Lightbulb, text: "How can I improve?" },
  ];

  // Handle voice transcript/response for adding to message history
  const handleVoiceTranscript = (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const handleVoiceResponse = (text: string) => {
    const coachMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'coach',
      content: text,
    };
    setMessages(prev => [...prev, coachMessage]);
  };

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">AI Coach</h1>
          <p className="text-slate-400">Golden Era coaching: build discipline, not dopamine habits.</p>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setChatMode('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              chatMode === 'voice'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voice</span>
          </button>
          <button
            onClick={() => setChatMode('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              chatMode === 'text'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden sm:inline">Text</span>
          </button>
        </div>
      </div>

      {/* Voice Chat Mode */}
      {chatMode === 'voice' && (
        <div className="flex-1 flex flex-col">
          <div className="glass-card p-8 flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Voice Trading Coach</h2>
              <p className="text-slate-400 text-sm max-w-sm">
                Tap the microphone and ask about your trading patterns, biases, or how to improve your discipline.
              </p>
            </div>
            
            <VoiceChat
              tradingContext={tradingContext}
              onTranscript={handleVoiceTranscript}
              onResponse={handleVoiceResponse}
            />
          </div>
        </div>
      )}

      {/* Text Chat Mode */}
      {chatMode === 'text' && (
      <div className="flex-1 flex flex-col glass-card overflow-hidden">
        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                message.role === 'coach'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  : 'bg-white/10'
              }`}>
                {message.role === 'coach' 
                  ? <Sparkles className="w-5 h-5 text-white" />
                  : <MessageCircle className="w-5 h-5 text-slate-300" />
                }
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'coach'
                  ? 'bg-white/5'
                  : 'bg-indigo-500/20'
              }`}>
                <p className="text-white text-sm whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        {messages.length < 3 && (
          <div className="px-6 pb-4">
            <div className="flex gap-2 flex-wrap">
              {suggestions.map((suggestion, idx) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(suggestion.text);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-all"
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    {suggestion.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your trading patterns..."
              className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
