import { BiasDetection, Position, Trade } from '@/types';
import { analyzeBiases } from '@/lib/services/biasDetector';

export interface BehaviorHighlights {
  topConcerns: BiasDetection[];
  criticalCount: number;
  highCount: number;
  message: string;
}

export interface BehaviorReport {
  version: '1';
  generatedAt: string;
  disciplineScore: number;
  biases: BiasDetection[];
  highlights: BehaviorHighlights;
}

export interface ComputeBehaviorReportInput {
  trades: Trade[];
  positions?: Position[];
}

function buildGoldenEraMessage(
  disciplineScore: number,
  criticalCount: number,
  highCount: number
): string {
  if (criticalCount > 0) {
    return 'Golden Era focus: reduce high-risk behaviors first to build resilient, sustainable trading discipline over time.';
  }

  if (highCount > 0) {
    return 'Golden Era focus: keep compounding disciplined habits and lower remaining warning patterns to strengthen long-term resilience.';
  }

  if (disciplineScore >= 80) {
    return 'Golden Era focus: you are building sustainable decision habits. Protect consistency over short-term dopamine-driven trading.';
  }

  return 'Golden Era focus: steady, disciplined improvements create long-term prosperity more reliably than chasing quick profits.';
}

export function computeBehaviorReport(input: ComputeBehaviorReportInput): BehaviorReport {
  const { trades, positions = [] } = input;
  const analysis = analyzeBiases(trades, positions);
  const sortedBiases = [...analysis.biases].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  const criticalCount = sortedBiases.filter(bias => bias.severity === 'critical').length;
  const highCount = sortedBiases.filter(bias => bias.severity === 'high').length;
  const topConcerns = sortedBiases.filter(bias => bias.score > 20).slice(0, 3);

  return {
    version: '1',
    generatedAt: new Date().toISOString(),
    disciplineScore: analysis.disciplineScore,
    biases: sortedBiases,
    highlights: {
      topConcerns,
      criticalCount,
      highCount,
      message: buildGoldenEraMessage(analysis.disciplineScore, criticalCount, highCount),
    },
  };
}

export default { computeBehaviorReport };
