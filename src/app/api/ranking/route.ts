import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");

  const stageFilter = stage
    ? { match: { stage: { code: stage } } }
    : {};

  const scoreEvents = await prisma.scoreEvent.groupBy({
    by: ["userId"],
    where: stageFilter,
    _sum: { pointsTotal: true, pointsBase: true, pointsBonus: true },
  });

  const userIds = scoreEvents.map((e) => e.userId);

  const [users, exactCounts, resultCounts, knockoutSums, semifinalSums] =
    await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
      // Count exact scores
      prisma.scoreEvent.groupBy({
        by: ["userId"],
        where: {
          ...stageFilter,
          prediction: { match: {} },
          explanationJson: { path: ["exactScore"], equals: true },
        },
        _count: { id: true },
      }),
      // Count correct results
      prisma.scoreEvent.groupBy({
        by: ["userId"],
        where: {
          ...stageFilter,
          explanationJson: { path: ["correctResult"], equals: true },
        },
        _count: { id: true },
      }),
      // Knockout stage sum
      prisma.scoreEvent.groupBy({
        by: ["userId"],
        where: {
          match: { stage: { type: "KNOCKOUT" } },
        },
        _sum: { pointsTotal: true },
      }),
      // SF+Final sum
      prisma.scoreEvent.groupBy({
        by: ["userId"],
        where: {
          match: { stage: { code: { in: ["SF", "FINAL", "THIRD"] } } },
        },
        _sum: { pointsTotal: true },
      }),
    ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const exactMap = new Map(exactCounts.map((e) => [e.userId, e._count.id]));
  const resultMap = new Map(resultCounts.map((e) => [e.userId, e._count.id]));
  const knockoutMap = new Map(knockoutSums.map((e) => [e.userId, e._sum.pointsTotal ?? 0]));
  const sfMap = new Map(semifinalSums.map((e) => [e.userId, e._sum.pointsTotal ?? 0]));

  const ranking = scoreEvents
    .map((e) => ({
      userId: e.userId,
      user: userMap.get(e.userId)!,
      totalPoints: e._sum.pointsTotal ?? 0,
      exactScores: exactMap.get(e.userId) ?? 0,
      correctResults: resultMap.get(e.userId) ?? 0,
      knockoutPoints: knockoutMap.get(e.userId) ?? 0,
      sfFinalPoints: sfMap.get(e.userId) ?? 0,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      if (b.correctResults !== a.correctResults) return b.correctResults - a.correctResults;
      if (b.knockoutPoints !== a.knockoutPoints) return b.knockoutPoints - a.knockoutPoints;
      return b.sfFinalPoints - a.sfFinalPoints;
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  return NextResponse.json({ ranking });
}
