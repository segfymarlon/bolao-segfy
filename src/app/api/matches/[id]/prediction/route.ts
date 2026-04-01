import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMatchLocked } from "@/lib/utils";
import { createAuditLog, AuditAction } from "@/lib/audit";

const schema = z.object({
  homeGoalsPred: z.number().int().min(0).max(99),
  awayGoalsPred: z.number().int().min(0).max(99),
  qualifiedTeamId: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: matchId } = await params;
  const body = await req.json();

  try {
    const data = schema.parse(body);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { stage: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });
    }

    if (isMatchLocked(match.kickoffAt)) {
      return NextResponse.json(
        { error: "Palpite encerrado para esta partida" },
        { status: 422 }
      );
    }

    if (match.status === "CANCELLED" || match.status === "POSTPONED") {
      return NextResponse.json(
        { error: "Partida indisponível para palpite" },
        { status: 422 }
      );
    }

    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: session.id, matchId } },
    });

    let prediction;
    if (existing) {
      prediction = await prisma.prediction.update({
        where: { id: existing.id },
        data: {
          homeGoalsPred: data.homeGoalsPred,
          awayGoalsPred: data.awayGoalsPred,
          qualifiedTeamId: data.qualifiedTeamId ?? null,
        },
      });
      await createAuditLog({
        actorUserId: session.id,
        action: AuditAction.PREDICTION_UPDATED,
        entityType: "prediction",
        entityId: prediction.id,
        beforeJson: {
          homeGoalsPred: existing.homeGoalsPred,
          awayGoalsPred: existing.awayGoalsPred,
          qualifiedTeamId: existing.qualifiedTeamId,
        },
        afterJson: data,
      });
    } else {
      prediction = await prisma.prediction.create({
        data: {
          userId: session.id,
          matchId,
          homeGoalsPred: data.homeGoalsPred,
          awayGoalsPred: data.awayGoalsPred,
          qualifiedTeamId: data.qualifiedTeamId ?? null,
        },
      });
      await createAuditLog({
        actorUserId: session.id,
        action: AuditAction.PREDICTION_CREATED,
        entityType: "prediction",
        entityId: prediction.id,
        afterJson: data,
      });
    }

    return NextResponse.json({ prediction });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
