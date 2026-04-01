import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateScore } from "@/lib/scoring";
import { createAuditLog, AuditAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const matchId = body.matchId as string | undefined;

  const ruleset = await prisma.ruleset.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  const rulesetVersion = ruleset?.version ?? 1;

  const matchFilter = matchId ? { id: matchId } : { status: "FINISHED" as const };

  const matches = await prisma.match.findMany({
    where: matchFilter,
    include: { stage: true, result: true, predictions: true },
  });

  let totalScored = 0;

  for (const match of matches) {
    if (!match.result) continue;

    await prisma.$transaction(async (tx) => {
      await tx.scoreEvent.deleteMany({ where: { matchId: match.id } });

      for (const pred of match.predictions) {
        const breakdown = calculateScore(pred, match.result!, match.stage);
        await tx.scoreEvent.create({
          data: {
            userId: pred.userId,
            matchId: match.id,
            predictionId: pred.id,
            rulesetVersion,
            pointsBase: breakdown.pointsBase,
            pointsBonus: breakdown.pointsBonus,
            pointsTotal: breakdown.pointsTotal,
            explanationJson: breakdown.explanationJson as object,
          },
        });
        totalScored++;
      }
    });
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: AuditAction.RECALC_TRIGGERED,
    entityType: "system",
    entityId: matchId ?? "all",
    afterJson: { matchId, totalScored, rulesetVersion },
  });

  return NextResponse.json({ ok: true, totalScored });
}
