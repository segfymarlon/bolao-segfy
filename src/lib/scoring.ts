import type { MatchResult, Prediction, Stage } from "@prisma/client";

export interface ScoringConfig {
  group: {
    exactScore: number;
    exactDiffAndWinner: number;
    correctResult: number;
  };
  knockout: {
    exactScore: number;
    correctResult: number;
    correctQualified: number;
  };
  bonus: {
    sf: number;
    final: number;
    third: number;
  };
}

export const DEFAULT_SCORING: ScoringConfig = {
  group: {
    exactScore: 10,
    exactDiffAndWinner: 7,
    correctResult: 5,
  },
  knockout: {
    exactScore: 12,
    correctResult: 8,
    correctQualified: 4,
  },
  bonus: {
    sf: 2,
    final: 3,
    third: 1,
  },
};

export interface ScoreBreakdown {
  pointsBase: number;
  pointsBonus: number;
  pointsTotal: number;
  explanationJson: {
    exactScore: boolean;
    exactDiff: boolean;
    correctResult: boolean;
    correctQualified: boolean | null;
    stageBonus: number;
    stageCode: string;
    breakdown: string[];
  };
}

function getResult(home: number, away: number): "H" | "D" | "A" {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

export function calculateScore(
  prediction: Pick<
    Prediction,
    "homeGoalsPred" | "awayGoalsPred" | "qualifiedTeamId"
  >,
  result: Pick<
    MatchResult,
    "homeGoalsFt" | "awayGoalsFt" | "qualifiedTeamId"
  >,
  stage: Pick<Stage, "type" | "code" | "scoringBonus">,
  config: ScoringConfig = DEFAULT_SCORING
): ScoreBreakdown {
  const { homeGoalsPred: ph, awayGoalsPred: pa, qualifiedTeamId: pq } = prediction;
  const { homeGoalsFt: rh, awayGoalsFt: ra, qualifiedTeamId: rq } = result;

  const exactScore = ph === rh && pa === ra;
  const predDiff = ph - pa;
  const resDiff = rh - ra;
  const exactDiff = predDiff === resDiff;
  const predResult = getResult(ph, pa);
  const resResult = getResult(rh, ra);
  const correctResult = predResult === resResult;
  const isKnockout = stage.type === "KNOCKOUT";
  const correctQualified =
    isKnockout && rq ? pq === rq : null;

  const breakdown: string[] = [];
  let pointsBase = 0;

  if (isKnockout) {
    if (exactScore) {
      pointsBase = config.knockout.exactScore;
      breakdown.push(`Placar exato (${ph}x${pa}): +${config.knockout.exactScore}pts`);
    } else if (correctResult) {
      pointsBase = config.knockout.correctResult;
      breakdown.push(`Resultado correto (${predResult}): +${config.knockout.correctResult}pts`);
    }
    if (correctQualified === true) {
      pointsBase += config.knockout.correctQualified;
      breakdown.push(`Classificado correto: +${config.knockout.correctQualified}pts`);
    } else if (correctQualified === false) {
      breakdown.push(`Classificado errado: +0pts`);
    }
  } else {
    if (exactScore) {
      pointsBase = config.group.exactScore;
      breakdown.push(`Placar exato (${ph}x${pa}): +${config.group.exactScore}pts`);
    } else if (exactDiff && correctResult) {
      pointsBase = config.group.exactDiffAndWinner;
      breakdown.push(`Saldo exato e vencedor correto: +${config.group.exactDiffAndWinner}pts`);
    } else if (correctResult) {
      pointsBase = config.group.correctResult;
      breakdown.push(`Resultado correto (${predResult}): +${config.group.correctResult}pts`);
    } else {
      breakdown.push(`Errou resultado: +0pts`);
    }
  }

  const stageBonus = stage.scoringBonus;
  const pointsBonus = pointsBase > 0 ? stageBonus : 0;
  if (pointsBonus > 0) {
    breakdown.push(`Bônus de fase (${stage.code}): +${pointsBonus}pts`);
  }

  const pointsTotal = pointsBase + pointsBonus;

  return {
    pointsBase,
    pointsBonus,
    pointsTotal,
    explanationJson: {
      exactScore,
      exactDiff,
      correctResult,
      correctQualified,
      stageBonus,
      stageCode: stage.code,
      breakdown,
    },
  };
}
