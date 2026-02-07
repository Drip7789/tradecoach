import { NextRequest, NextResponse } from 'next/server';

// Groq configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Updated to current Groq models (Feb 2026)
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

interface TradingContext {
  // Portfolio overview
  cashBalance?: number;
  totalPortfolioValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  realizedPnL?: number;
  
  // Positions
  positions?: Array<{
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    assetType: string;
  }>;
  
  // Trade history
  trades?: Array<{
    id: string;
    symbol: string;
    action: string;
    pnl?: number;
    timestamp: string;
    quantity?: number;
    price?: number;
  }>;
  
  // Bias analysis
  biases?: Array<{
    bias_type: string;
    score: number;
    severity: string;
    intervention: string;
  }>;
  disciplineScore?: number;
  
  // Stats
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  winRate?: number;
}

interface ChatMessage {
  role: 'user' | 'coach' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, tradingContext, conversationHistory } = body as {
      message: string;
      tradingContext: TradingContext;
      conversationHistory?: ChatMessage[];
    };

    console.log('=== TEXT CHAT REQUEST ===');
    console.log('Message:', message);

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Get AI response from Groq
    const response = await getCoachingResponse(message, tradingContext || {}, conversationHistory || []);

    console.log('=== TEXT CHAT SUCCESS ===');
    return NextResponse.json({ response });

  } catch (error) {
    console.error('=== TEXT CHAT ERROR ===', error);
    
    // Return error message that the frontend can display
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json(
      { 
        error: errorMessage,
        response: `Sorry, I'm having trouble connecting to my AI brain right now. Error: ${errorMessage}. Please check that your GROQ_API_KEY is set correctly in .env.local and restart the server.`
      },
      { status: 500 }
    );
  }
}

async function getCoachingResponse(
  userMessage: string,
  context: TradingContext,
  history: ChatMessage[]
): Promise<string> {
  console.log('=== GROQ API CALL ===');
  console.log('API Key present:', !!GROQ_API_KEY);
  console.log('Model:', GROQ_MODEL);
  console.log('User message:', userMessage);
  console.log('Trading context:', JSON.stringify(context, null, 2));

  // If no Groq API key, throw error (don't silently fallback)
  if (!GROQ_API_KEY) {
    console.error('ERROR: No GROQ_API_KEY environment variable set!');
    throw new Error('Groq API key not configured. Please add GROQ_API_KEY to your .env.local file.');
  }

  const systemPrompt = buildSystemPrompt(context);
  
  // Build messages array with conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(msg => ({
      role: msg.role === 'coach' ? 'assistant' : msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  console.log('Sending to Groq with', messages.length, 'messages');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', response.status, errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Groq response received:', data.choices?.[0]?.message?.content?.substring(0, 100) + '...');
  
  const aiResponse = data.choices?.[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response content from Groq');
  }
  
  return aiResponse;
}

function buildSystemPrompt(context: TradingContext): string {
  const { 
    cashBalance = 0,
    totalPortfolioValue = 0,
    unrealizedPnL = 0,
    unrealizedPnLPercent = 0,
    realizedPnL = 0,
    positions = [],
    trades = [], 
    biases = [], 
    disciplineScore = 0, 
    totalTrades = 0,
    winningTrades = 0,
    losingTrades = 0,
    winRate = 0,
  } = context;

  let prompt = `You are BiasCoach, an expert trading psychologist and behavioral finance coach.
Your role is to help traders understand and overcome their psychological biases.

PERSONALITY:
- Warm, supportive, but direct about behavioral issues
- Use casual, conversational language
- Be encouraging but honest
- Use emojis sparingly to add warmth

RULES:
- Reference the trader's SPECIFIC data when relevant (exact dollar amounts, positions, etc.)
- Provide actionable, specific advice
- Focus on emotional discipline and psychology
- Never give financial advice or specific trade recommendations
- Keep responses concise but thorough

===== TRADER'S PORTFOLIO =====

💰 ACCOUNT OVERVIEW:
- Available Cash: $${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Portfolio Value: $${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Unrealized P&L: ${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)} (${unrealizedPnLPercent >= 0 ? '+' : ''}${unrealizedPnLPercent.toFixed(2)}%)
- Realized P&L: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)}

`;

  // Add current positions
  if (positions.length > 0) {
    prompt += `📊 CURRENT POSITIONS (${positions.length}):\n`;
    positions.forEach((pos, i) => {
      const pnlSign = pos.pnl >= 0 ? '+' : '';
      prompt += `${i + 1}. ${pos.symbol}: ${pos.quantity} shares @ $${pos.avgCost.toFixed(2)} avg → Current: $${pos.currentPrice.toFixed(2)} (${pnlSign}$${pos.pnl.toFixed(2)}, ${pnlSign}${pos.pnlPercent.toFixed(1)}%)\n`;
    });
    prompt += '\n';
  } else {
    prompt += `📊 CURRENT POSITIONS: None - 100% in cash\n\n`;
  }

  prompt += `📈 TRADING STATS:
- Total Trades: ${totalTrades}
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}
- Win Rate: ${winRate.toFixed(1)}%
- Discipline Score: ${disciplineScore}/100

`;

  // Add bias information
  const activeBiases = biases.filter(b => b.score > 25);
  if (activeBiases.length > 0) {
    prompt += `⚠️ DETECTED BEHAVIORAL BIASES:\n`;
    activeBiases.forEach(bias => {
      const biasName = bias.bias_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      prompt += `- ${biasName}: ${bias.severity} severity (${bias.score}%)\n  → ${bias.intervention}\n`;
    });
    prompt += '\n';
  } else {
    prompt += '✅ DETECTED BIASES: None significant - trader is doing well!\n\n';
  }

  // Add recent trades
  if (trades.length > 0) {
    prompt += `🕐 RECENT TRADES (last ${Math.min(trades.length, 5)}):\n`;
    trades.slice(0, 5).forEach((trade, i) => {
      const pnlStr = trade.pnl !== undefined 
        ? (trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`)
        : 'open';
      const date = new Date(trade.timestamp).toLocaleDateString();
      prompt += `${i + 1}. [${date}] ${trade.action} ${trade.quantity || ''} ${trade.symbol} @ $${trade.price?.toFixed(2) || '?'} → ${pnlStr}\n`;
    });
    prompt += '\n';
  }

  prompt += `===== END DATA =====

Use this data to provide personalized, context-aware coaching. When the trader asks about their portfolio, cash, positions, performance, or patterns, reference the SPECIFIC numbers above. Be their supportive trading psychology coach!`;

  return prompt;
}

function generateFallbackResponse(query: string, context: TradingContext): string {
  const { biases = [], disciplineScore = 0, totalTrades = 0, winRate = 0 } = context;
  const queryLower = query.toLowerCase();

  // Check for specific topics
  if (queryLower.includes('bias') || queryLower.includes('problem') || queryLower.includes('issue') || queryLower.includes('wrong')) {
    const activeBiases = biases.filter(b => b.score > 30);
    if (activeBiases.length > 0) {
      const topBias = activeBiases[0];
      const biasName = topBias.bias_type.replace(/_/g, ' ');
      return `Your main challenge right now is **${biasName}** with a ${topBias.score}% severity score. ${topBias.intervention}\n\nWould you like specific strategies to work on this?`;
    }
    return "Great news! 🎉 I'm not detecting any major biases in your trading patterns. Your discipline score is solid. Keep up the consistent approach!";
  }

  if (queryLower.includes('score') || queryLower.includes('discipline') || queryLower.includes('doing') || queryLower.includes('performance')) {
    let response = `Your discipline score is **${disciplineScore}/100**. `;
    if (totalTrades > 0) {
      response += `You've made ${totalTrades} trades with a ${winRate.toFixed(1)}% win rate. `;
    }
    if (disciplineScore >= 80) {
      response += "This is excellent! 🌟 You're showing strong emotional control.";
    } else if (disciplineScore >= 60) {
      response += "That's good progress! Focus on consistency to push higher.";
    } else {
      response += "There's room to grow, but that's exactly why I'm here to help!";
    }
    return response;
  }

  if (queryLower.includes('improve') || queryLower.includes('help') || queryLower.includes('better') || queryLower.includes('tip')) {
    const tips = [
      "**Pause before trading** - Take 10 seconds before every trade. Ask: Am I trading based on analysis or emotion?",
      "**Set strict position limits** - Never risk more than 2-5% of your account on a single trade.",
      "**Journal your emotions** - Note how you feel before and after each trade. Patterns will emerge.",
      "**Use a pre-trade checklist** - Write down 3 criteria that must be met before you enter any trade.",
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return `Here's a powerful tip: ${randomTip}\n\nWant more specific advice based on your trading patterns?`;
  }

  if (queryLower.includes('revenge') || queryLower.includes('angry') || queryLower.includes('loss') || queryLower.includes('lost')) {
    return "After a loss, your brain's fight-or-flight response kicks in, urging you to \"win it back\" immediately. This is **revenge trading** - and it usually makes things worse. 🛑\n\n**Try this:** Set a rule to take a 30-minute break after any losing trade. Use that time to walk, breathe, or journal. Come back with a clear head.";
  }

  if (queryLower.includes('overtrad') || queryLower.includes('too many') || queryLower.includes('too much') || queryLower.includes('trading a lot')) {
    return "Quality over quantity is the secret of successful traders. 📊\n\n**Challenge:** Try limiting yourself to just 3 well-researched trades per day for a week. Track your results - most traders find their win rate actually improves when they're more selective!";
  }

  if (queryLower.includes('hello') || queryLower.includes('hi') || queryLower.includes('hey')) {
    return `Hey there! 👋 I'm your AI trading coach. I can see you have ${totalTrades} trades on record. What would you like to work on today? I can analyze your biases, discuss your discipline score, or give you tips to improve!`;
  }

  // Default response
  return "I'm here to help you become a more disciplined trader! 💪 You can ask me about:\n\n• Your biases and behavioral patterns\n• Your discipline score and performance\n• Tips to improve your trading psychology\n• Specific situations you're struggling with\n\nWhat's on your mind?";
}

