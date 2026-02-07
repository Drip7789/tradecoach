'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { analyzeBiases } from '@/lib/services/biasDetector';
import { getBiasDefinition } from '@/constants/biasDefinitions';
import { 
  MessageCircle, 
  Send, 
  Sparkles,
  Brain,
  AlertTriangle,
  Lightbulb,
  Target
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
}

export default function CoachPage() {
  const { trades, positions, disciplineScore } = usePortfolioStore();
  const analysis = analyzeBiases(trades, positions);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'coach',
      content: getWelcomeMessage(analysis.disciplineScore, analysis.biases.length, trades.length),
    },
  ]);
  const [input, setInput] = useState('');

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

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const response = generateResponse(input.toLowerCase(), analysis);
      const coachMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: response,
      };
      setMessages(prev => [...prev, coachMessage]);
    }, 1000);
  };

  function generateResponse(query: string, analysis: ReturnType<typeof analyzeBiases>): string {
    const { biases, disciplineScore } = analysis;
    const topBias = biases[0];

    if (query.includes('bias') || query.includes('problem')) {
      if (topBias && topBias.score > 30) {
        const def = getBiasDefinition(topBias.bias_type);
        return `Your most significant pattern right now is **${def.name}**. ${def.description}\n\n💡 **Try this**: ${def.interventions[0]}`;
      }
      return "Great news! I'm not detecting any significant biases in your recent trading. Keep up the disciplined approach!";
    }

    if (query.includes('score') || query.includes('discipline')) {
      return `Your discipline score is **${disciplineScore}/100**. ${
        disciplineScore >= 80 
          ? "This is excellent! You're trading with great emotional control."
          : disciplineScore >= 60
            ? "This is good, but there's room to improve. Focus on consistency."
            : "There's definitely room for improvement. Let's work on building better habits together."
      }`;
    }

    if (query.includes('help') || query.includes('improve')) {
      return `Here are 3 ways to improve your trading discipline:\n\n1. **Wait before trading** - Take a 10-second pause before each trade\n2. **Set position limits** - Never risk more than 5% on a single trade\n3. **Journal your emotions** - Note how you feel before and after each trade`;
    }

    if (query.includes('overtrad') || query.includes('too many')) {
      return "Overtrading is one of the most common behavioral issues! The cure is simple but hard: **trade less, think more**. Try limiting yourself to 3-5 trades per day and see how your results improve.";
    }

    return "That's a great question! I'm here to help you understand your trading patterns and build better habits. Try asking about your biases, discipline score, or how to improve!";
  }

  // Quick suggestions
  const suggestions = [
    { icon: Brain, text: "What are my biases?" },
    { icon: Target, text: "How's my discipline?" },
    { icon: Lightbulb, text: "How can I improve?" },
  ];

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">AI Coach</h1>
        <p className="text-slate-400">Your personal trading psychology assistant</p>
      </div>

      {/* Chat Container */}
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
              disabled={!input.trim()}
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
