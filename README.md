# Money Trees 🌲

**A behavioral trading psychology platform that actually helps you trade better.**

Built for QHacks 2026 — National Bank of Canada Bias Detector Challenge

---

## What is this?

Most trading apps show you profits and losses. Cool. But they don't tell you *why* you keep making the same mistakes.

Money Trees analyzes your trading patterns and detects psychological biases that mess with your decision-making. Things like:

- **Overtrading** — You trade way too much after wins or losses
- **Loss Aversion** — You hold losers forever hoping they'll come back
- **Revenge Trading** — You double down after a loss trying to "win it back"
- **Disposition Effect** — You sell winners too early
- **And 5 more biases** based on actual academic research

We give you a **Discipline Score** (0-100) and personalized coaching to help you build sustainable trading habits.

---

## Features

### 📊 Paper Trading
Practice trading stocks, forex, ETFs, and commodities with $15k fake money. Every trade gets analyzed.

### 🧠 9 Bias Detectors
Research-backed algorithms that catch patterns you don't notice. Based on papers from Kahneman & Tversky (Nobel Prize), Barber & Odean, and others.

### 🎤 Voice AI Coach
Talk to your trading coach. Powered by Gradium (speech-to-text & text-to-speech) and Groq (fast LLM). Ask things like "What's my worst habit?" or "How can I improve?"

### 📈 Visual Insights
Charts showing your P&L timeline, bias severity, win/loss distribution, and more.

### 📁 Import Your Data
Upload a CSV of your real trading history and get the same analysis. We don't store anything — it all runs in your browser.

### 🌱 Growth Mode
XP and streaks based on discipline, not profits. Because good habits compound.

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Drip7789/tradecoach.git
cd tradecoach/biascoach
npm install
```

### 2. Set up API keys

Create a file called `.env.local` in the `biascoach` folder:

```
GRADIUM_API_KEY=your_gradium_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

**Where to get keys:**
- **Gradium** — [gradium.ai](https://gradium.ai) — Sign up and get an API key for voice features
- **Groq** — [console.groq.com](https://console.groq.com) — Free tier available, get an API key

The voice coach won't work without these. Text features and bias detection work fine without them.

### 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to Use

1. **Dashboard** — See your portfolio value, discipline score, and allocations
2. **Trade** — Buy/sell assets to build a trading history
3. **Insights** — View your bias analysis and charts. Upload external CSVs here too
4. **Coach** — Talk or text with the AI about your trading patterns
5. **Growth** — Track your discipline streaks and XP

Make at least 5-10 trades before expecting meaningful bias detection.

---

## CSV Import Format

If you want to analyze your own trading data, format your CSV like this:

```
timestamp,asset,side,quantity,entry_price,exit_price,profit_loss,balance
2025-03-01 9:30,NVDA,SELL,29,181.42,180.38,-30.11,9969.89
2025-03-01 10:15,AAPL,BUY,50,175.00,178.50,175.00,10144.89
```

Columns: `timestamp`, `asset` (symbol), `side` (BUY/SELL), `quantity`, `entry_price`, `exit_price`, `profit_loss`, `balance`

---

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** (custom dark theme)
- **Zustand** for state management
- **Recharts** for visualizations
- **Gradium AI** for voice (STT/TTS)
- **Groq** for fast LLM responses

---

## The Research

Our bias detection is based on peer-reviewed behavioral finance research:

- Barber & Odean (2000) — "Trading Is Hazardous to Your Wealth"
- Odean (1998) — "Are Investors Reluctant to Realize Their Losses?"
- Kahneman & Tversky (1979) — Prospect Theory (Nobel Prize)
- Gervais & Odean (2001) — Overconfidence
- Statman (1987) — Portfolio concentration

Full citations in `ALGORITHM_RESEARCH.md`.

---

## Demo Video

🎬 **Gradium Track Pitch Video** — Coming soon

---

## Team

Built at QHacks 2026 🍁

---

## License

MIT — do whatever you want with it

