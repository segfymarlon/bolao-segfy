import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditAction } from "@/lib/audit";
import { calculateScore, DEFAULT_SCORING } from "@/lib/scoring";

const schema = z.object({
  homeGoalsFt: z.number().int().min(0),
  awayGoalsFt: z.number().int().min(0),
  homeGoalsEt: z.number().int().min(0).optional().nullable(),
  awayGoalsEt: z.number().int().min(0).optional().nullable(),
  penaltiesHome: z.number().int().min(0).optional().nullable(),
  penaltiesAway: z.number().int().min(0).optional().nullable(),
  qualifiedTeamId: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id: matchId } = await params;
  const body = await req.json();

  try {
    const data = schema.parse(body);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { stage: true },
    });
    if (!match) return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });

    const existingResult = await prisma.matchResult.findUnique({
      where: { matchId },
    });

    // Get active ruleset version
    const ruleset = await prisma.ruleset.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    });
    const rulesetVersion = ruleset?.version ?? 1;

    const result = await prisma.$transaction(async (tx) => {
      // Upsert result
      const matchResult = await tx.matchResult.upsert({
        where: { matchId },
        create: { ...data, matchId, publishedBy: admin.id, version: 1 },
        update: {
          ...data,
          publishedBy: admin.id,
          version: { increment: 1 },
          publishedAt: new Date(),
        },
      });

      // Update match status
      await tx.match.update({
        where: { id: matchId },
        data: { status: "FINISHED" },
      });

      // Get predictions for this match
      const predictions = await tx.prediction.findMany({
        where: { matchId },
      });

      // Delete old score events (idempotent recalc)
      await tx.scoreEvent.deleteMany({ where: { matchId } });

      // Calculate and insert new score events
      for (const pred of predictions) {
        const breakdown = calculateScore(pred, matchResult, match.stage);
        await tx.scoreEvent.create({
          data: {
            userId: pred.userId,
            matchId,
            predictionId: pred.id,
            rulesetVersion,
            pointsBase: breakdown.pointsBase,
            pointsBonus: breakdown.pointsBonus,
            pointsTotal: breakdown.pointsTotal,
            explanationJson: breakdown.explanationJson as object,
          },
        });
        await tx.prediction.update({
          where: { id: pred.id },
          data: { status: "SCORED" },
        });
      }

      return matchResult;
    });

    await createAuditLog({
      actorUserId: admin.id,
      action: existingResult ? AuditAction.RESULT_UPDATED : AuditAction.RESULT_PUBLISHED,
      entityType: "match_result",
      entityId: result.id,
      beforeJson: existingResult ?? undefined,
      afterJson: data,
    });

    return NextResponse.json({ result, scored: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
