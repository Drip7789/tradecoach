import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI (or use Anthropic if preferred)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GRADIUM_API_KEY = process.env.GRADIUM_API_KEY;
const GRADIUM_API_URL = 'https://us.api.gradium.ai/api';

export async function POST(request: NextRequest) {
  try {
    // 1. Get audio and trading context from request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const tradingContextJson = formData.get('tradingContext') as string;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Parse trading context from client
    let tradingContext = {};
    try {
      tradingContext = JSON.parse(tradingContextJson || '{}');
    } catch {
      console.warn('Failed to parse trading context');
    }

    // 2. Transcribe audio with Gradium STT
    const userQuestion = await transcribeAudio(audioFile);
    console.log('User asked:', userQuestion);

    if (!userQuestion || userQuestion.trim() === '') {
      return NextResponse.json({ 
        error: 'Could not transcribe audio. Please try again.',
        transcript: '' 
      }, { status: 400 });
    }

    // 3. Get AI coaching response with trading context
    const coachingText = await getCoachingResponse(userQuestion, tradingContext);
    console.log('Coach responds:', coachingText);

    // 4. Synthesize speech with Gradium TTS
    const audioBuffer = await synthesizeSpeech(coachingText);

    // 5. Return audio with transcript and response text
    const response = new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'X-Transcript': encodeURIComponent(userQuestion),
        'X-Response-Text': encodeURIComponent(coachingText),
      },
    });

    return response;

  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice chat failed' },
      { status: 500 }
    );
  }
}

// Transcribe audio using Gradium STT
async function transcribeAudio(audioFile: File): Promise<string> {
  if (!GRADIUM_API_KEY) {
    throw new Error('Gradium API key not configured');
  }

  const audioBuffer = await audioFile.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  const response = await fetch(`${GRADIUM_API_URL}/speech/stt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GRADIUM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64Audio,
      sample_rate: 24000,
      language: 'en',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gradium STT error:', errorText);
    throw new Error(`Speech transcription failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text || data.transcript || '';
}

// Get AI coaching response with trading context
async function getCoachingResponse(
  userQuery: string,
  context: TradingContext
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback response if no API key
    return generateFallbackResponse(userQuery, context);
  }

  const systemPrompt = `You are an expert trading psychologist and behavioral finance coach named BiasCoach.
Your role is to help traders understand and overcome their psychological biases.

IMPORTANT RULES:
- Keep responses under 80 words (they will be spoken aloud)
- Be warm, supportive, but direct about behavioral issues
- Reference specific data when available (trade counts, scores, bias names)
- Provide ONE actionable tip per response
- Use simple language, avoid jargon
- Never give financial advice or trade recommendations
- Focus on emotional discipline and psychology`;

  const userPrompt = buildContextPrompt(userQuery, context);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || generateFallbackResponse(userQuery, context);
  } catch (error) {
    console.error('OpenAI error:', error);
    return generateFallbackResponse(userQuery, context);
  }
}

interface TradingContext {
  trades?: Array<{
    id: string;
    symbol: string;
    action: string;
    pnl?: number;
    timestamp: string;
  }>;
  biases?: Array<{
    bias_type: string;
    score: number;
    severity: string;
    intervention: string;
  }>;
  disciplineScore?: number;
  totalTrades?: number;
  winRate?: number;
  totalPnL?: number;
}

// Build context-rich prompt for the LLM
function buildContextPrompt(query: string, data: TradingContext): string {
  const { trades = [], biases = [], disciplineScore = 0, totalTrades = 0, winRate = 0, totalPnL = 0 } = data;

  let prompt = `TRADER'S CURRENT STATE:
- Total Trades: ${totalTrades}
- Win Rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnL.toFixed(2)}
- Discipline Score: ${disciplineScore}/100

`;

  // Add bias information
  const activeBiases = biases.filter(b => b.score > 25);
  if (activeBiases.length > 0) {
    prompt += `DETECTED BEHAVIORAL BIASES:\n`;
    activeBiases.forEach(bias => {
      const biasName = bias.bias_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      prompt += `- ${biasName}: ${bias.severity} severity (${bias.score}%)\n`;
    });
    prompt += '\n';
  } else {
    prompt += 'DETECTED BIASES: None significant\n\n';
  }

  // Add recent trade info
  if (trades.length > 0) {
    const recentTrades = trades.slice(0, 5);
    const wins = recentTrades.filter(t => (t.pnl || 0) > 0).length;
    const losses = recentTrades.filter(t => (t.pnl || 0) < 0).length;
    prompt += `RECENT ACTIVITY: ${wins} wins, ${losses} losses in last ${recentTrades.length} trades\n\n`;
  }

  prompt += `TRADER'S QUESTION: "${query}"\n\nProvide personalized coaching advice:`;

  return prompt;
}

// Fallback response when OpenAI is not available
function generateFallbackResponse(query: string, context: TradingContext): string {
  const { biases = [], disciplineScore = 0 } = context;
  const queryLower = query.toLowerCase();

  // Check for specific topics
  if (queryLower.includes('bias') || queryLower.includes('problem') || queryLower.includes('issue')) {
    const topBias = biases.find(b => b.score > 30);
    if (topBias) {
      const biasName = topBias.bias_type.replace(/_/g, ' ');
      return `I'm seeing ${biasName} as your main challenge right now with a ${topBias.score}% severity. ${topBias.intervention}`;
    }
    return "Great news! I'm not detecting any major biases in your trading patterns. Keep up the disciplined approach!";
  }

  if (queryLower.includes('score') || queryLower.includes('discipline') || queryLower.includes('doing')) {
    if (disciplineScore >= 80) {
      return `Your discipline score is ${disciplineScore} out of 100. Excellent! You're showing strong emotional control in your trading.`;
    } else if (disciplineScore >= 60) {
      return `Your discipline score is ${disciplineScore} out of 100. That's good progress! Focus on consistency and you'll see improvement.`;
    }
    return `Your discipline score is ${disciplineScore} out of 100. There's room to grow, but that's exactly why I'm here to help!`;
  }

  if (queryLower.includes('improve') || queryLower.includes('help') || queryLower.includes('better')) {
    return "Here's my top tip: pause for 10 seconds before every trade. Ask yourself - am I trading based on analysis, or emotion? This simple habit can transform your discipline.";
  }

  if (queryLower.includes('revenge') || queryLower.includes('angry') || queryLower.includes('loss')) {
    return "After a loss, your brain wants to recover immediately. But revenge trading usually leads to bigger losses. Try taking a 30-minute break after any losing trade.";
  }

  if (queryLower.includes('overtrad') || queryLower.includes('too many') || queryLower.includes('too much')) {
    return "Quality over quantity is the key to trading success. Try limiting yourself to 3 to 5 well-researched trades per day instead of many impulsive ones.";
  }

  // Default response
  return "I'm here to help you understand your trading psychology. You can ask me about your biases, discipline score, or how to improve your trading habits!";
}

// Synthesize speech using Gradium TTS
async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  if (!GRADIUM_API_KEY) {
    throw new Error('Gradium API key not configured');
  }

  const response = await fetch(`${GRADIUM_API_URL}/speech/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GRADIUM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      voice_id: 'YTpq7expH9539ERJ', // Default voice - can be changed
      output_format: 'wav',
      sample_rate: 24000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gradium TTS error:', errorText);
    throw new Error(`Speech synthesis failed: ${response.status}`);
  }

  return await response.arrayBuffer();
}

