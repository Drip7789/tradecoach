import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

const GRADIUM_API_KEY = process.env.GRADIUM_API_KEY;

// Gradium API endpoints (from docs)
const GRADIUM_STT_WS = 'wss://us.api.gradium.ai/api/speech/asr';
const GRADIUM_TTS_POST = 'https://us.api.gradium.ai/api/post/speech/tts';

// Groq for LLM
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function POST(request: NextRequest) {
  const totalStart = Date.now();
  
  try {
    console.log('=== VOICE CHAT REQUEST ===');
    
    // 1. Get audio and trading context from request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const tradingContextJson = formData.get('tradingContext') as string;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`📁 Audio: ${audioFile.size} bytes`);

    // Parse trading context from client
    let tradingContext = {};
    try {
      tradingContext = JSON.parse(tradingContextJson || '{}');
    } catch {
      console.warn('Failed to parse trading context');
    }

    // 2. Transcribe audio with Gradium STT (WebSocket)
    const sttStart = Date.now();
    const userQuestion = await transcribeAudioGradium(audioFile);
    console.log(`🎤 STT: ${Date.now() - sttStart}ms - "${userQuestion}"`);

    if (!userQuestion || userQuestion.trim() === '') {
      return NextResponse.json({ 
        error: 'Could not transcribe audio. Please speak more clearly.',
        transcript: '' 
      }, { status: 400 });
    }

    // 3. Get AI coaching response with trading context (Groq)
    const llmStart = Date.now();
    const coachingText = await getCoachingResponse(userQuestion, tradingContext);
    console.log(`🤖 LLM: ${Date.now() - llmStart}ms`);

    // 4. Synthesize speech with Gradium TTS (HTTP POST)
    const ttsStart = Date.now();
    const audioBuffer = await synthesizeSpeechGradium(coachingText);
    console.log(`🔊 TTS: ${Date.now() - ttsStart}ms`);

    // 5. Return audio with transcript and response text
    const response = new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'X-Transcript': encodeURIComponent(userQuestion),
        'X-Response-Text': encodeURIComponent(coachingText),
      },
    });

    console.log(`✅ TOTAL: ${Date.now() - totalStart}ms`);
    return response;

  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice chat failed' },
      { status: 500 }
    );
  }
}

// Transcribe audio using Gradium STT (WebSocket)
async function transcribeAudioGradium(audioFile: File): Promise<string> {
  console.log('=== GRADIUM STT ===');
  
  if (!GRADIUM_API_KEY) {
    throw new Error('Gradium API key not configured');
  }

  const audioBuffer = await audioFile.arrayBuffer();
  const audioData = Buffer.from(audioBuffer);
  
  console.log('Audio buffer size:', audioData.length, 'bytes');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GRADIUM_STT_WS, {
      headers: {
        'x-api-key': GRADIUM_API_KEY,
      },
    });

    let transcribedText = '';
    let isSetupDone = false;

    ws.on('open', () => {
      console.log('Gradium STT WebSocket connected');
      
      // Send setup message first
      const setupMessage = {
        type: 'setup',
        model_name: 'default',
        input_format: 'wav', // We'll send WAV data
      };
      ws.send(JSON.stringify(setupMessage));
      console.log('Sent setup message');
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Gradium STT message:', message.type);

        if (message.type === 'ready') {
          isSetupDone = true;
          console.log('Gradium STT ready, sending audio...');
          
          // Send audio data as base64
          const audioMessage = {
            type: 'audio',
            audio: audioData.toString('base64'),
          };
          ws.send(JSON.stringify(audioMessage));
          
          // Send end of stream
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'end_of_stream' }));
            console.log('Sent end_of_stream');
          }, 100);
        } 
        else if (message.type === 'text') {
          transcribedText += message.text + ' ';
          console.log('Transcribed chunk:', message.text);
        }
        else if (message.type === 'end_of_stream') {
          console.log('Gradium STT complete, text:', transcribedText.trim());
          ws.close();
          resolve(transcribedText.trim());
        }
        else if (message.type === 'error') {
          console.error('Gradium STT error:', message.message);
          ws.close();
          reject(new Error(message.message || 'STT error'));
        }
      } catch (e) {
        console.error('Error parsing Gradium message:', e);
      }
    });

    ws.on('error', (error: Error) => {
      console.error('Gradium STT WebSocket error:', error);
      reject(new Error(`Gradium STT connection failed: ${error.message}`));
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log('Gradium STT WebSocket closed:', code, reason.toString());
      if (!transcribedText) {
        // If we closed without getting text, resolve with empty
        resolve('');
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('STT timeout'));
      }
    }, 30000);
  });
}

// Synthesize speech using Gradium TTS (HTTP POST)
async function synthesizeSpeechGradium(text: string): Promise<ArrayBuffer> {
  console.log('=== GRADIUM TTS ===');
  console.log('Text to synthesize:', text.substring(0, 100) + '...');
  
  if (!GRADIUM_API_KEY) {
    throw new Error('Gradium API key not configured');
  }

  const response = await fetch(GRADIUM_TTS_POST, {
    method: 'POST',
    headers: {
      'x-api-key': GRADIUM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      voice_id: 'YTpq7expH9539ERJ', // Emma voice (default female US English)
      output_format: 'wav',
      only_audio: true,
    }),
  });

  console.log('Gradium TTS response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gradium TTS error:', errorText);
    throw new Error(`Gradium TTS failed: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  console.log('Gradium TTS audio size:', audioBuffer.byteLength, 'bytes');
  
  return audioBuffer;
}

// Groq LLM for coaching response
interface TradingContext {
  cashBalance?: number;
  totalPortfolioValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  realizedPnL?: number;
  positions?: Array<{
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
  }>;
  trades?: Array<{
    id: string;
    symbol: string;
    action: string;
    pnl?: number;
    timestamp: string;
    quantity?: number;
    price?: number;
  }>;
  biases?: Array<{
    bias_type: string;
    score: number;
    severity: string;
    intervention: string;
  }>;
  disciplineScore?: number;
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  winRate?: number;
}

async function getCoachingResponse(
  userQuery: string,
  context: TradingContext
): Promise<string> {
  console.log('=== GROQ LLM ===');

  if (!GROQ_API_KEY) {
    console.error('No GROQ_API_KEY set!');
    return generateFallbackResponse(userQuery, context);
  }

  // Ultra-short for fast TTS (TTS is the bottleneck)
  const systemPrompt = `You are BiasCoach. Reply in 20-30 words MAX. Be direct and reference their data. One tip only. No financial advice.`;

  const userPrompt = buildContextPrompt(userQuery, context);

  console.log('Calling Groq API...');
  const startTime = Date.now();
  
  // Use faster 8B model for voice (speed > quality tradeoff)
  const fastModel = 'llama-3.1-8b-instant';
  
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: fastModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 60, // Short responses = faster TTS
      temperature: 0.5,
    }),
  });
  
  console.log(`Groq responded in ${Date.now() - startTime}ms`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', response.status, errorText);
    return generateFallbackResponse(userQuery, context);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;
  
  console.log('Groq response:', aiResponse?.substring(0, 100) + '...');
  
  return aiResponse || generateFallbackResponse(userQuery, context);
}

function buildContextPrompt(query: string, data: TradingContext): string {
  const { 
    cashBalance = 0,
    totalPortfolioValue = 0,
    unrealizedPnL = 0,
    realizedPnL = 0,
    positions = [],
    biases = [], 
    disciplineScore = 0, 
    totalTrades = 0,
    winningTrades = 0,
    losingTrades = 0,
    winRate = 0,
  } = data;

  // Compact context for speed (fewer tokens = faster)
  const topBias = biases.find(b => b.score > 25);
  const biasInfo = topBias ? `Bias: ${topBias.bias_type.replace(/_/g, ' ')} (${topBias.score}%)` : 'No major biases';
  
  const prompt = `Cash: $${cashBalance.toLocaleString()} | Portfolio: $${totalPortfolioValue.toLocaleString()} | Score: ${disciplineScore}/100
${positions.length > 0 ? positions.slice(0, 2).map(p => `${p.symbol}: ${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(0)}`).join(', ') : 'No positions'}
Stats: ${totalTrades} trades, ${winRate.toFixed(0)}% win | ${biasInfo}

Q: "${query}"
Answer in 20-30 words:`;

  return prompt;
}

function generateFallbackResponse(query: string, context: TradingContext): string {
  const { biases = [], disciplineScore = 0, cashBalance = 0 } = context;
  const queryLower = query.toLowerCase();

  if (queryLower.includes('cash') || queryLower.includes('balance') || queryLower.includes('money')) {
    return `You have $${cashBalance.toLocaleString()} in available cash. ${
      cashBalance > 50000 
        ? "That's a healthy cash position - you have flexibility to wait for good opportunities."
        : "Consider keeping some cash reserve for unexpected opportunities."
    }`;
  }

  if (queryLower.includes('bias') || queryLower.includes('problem')) {
    const topBias = biases.find(b => b.score > 30);
    if (topBias) {
      const biasName = topBias.bias_type.replace(/_/g, ' ');
      return `Your main challenge is ${biasName} with ${topBias.score}% severity. ${topBias.intervention}`;
    }
    return "Great news! No significant biases detected. Keep up the disciplined approach!";
  }

  if (queryLower.includes('score') || queryLower.includes('discipline')) {
    return `Your discipline score is ${disciplineScore} out of 100. ${
      disciplineScore >= 80 ? "Excellent self-control!" 
        : disciplineScore >= 60 ? "Good progress, focus on consistency."
        : "Room to grow - I'm here to help!"
    }`;
  }

  return "I'm here to help with your trading psychology! Ask me about your biases, discipline score, cash position, or how to improve.";
}
