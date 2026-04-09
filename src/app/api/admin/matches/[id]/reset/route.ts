import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditAction } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id: matchId } = await params;

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });

    const { deletedPredictions, deletedScoreEvents, deletedResult } = await prisma.$transaction(async (tx) => {
      const { count: deletedScoreEvents } = await tx.scoreEvent.deleteMany({ where: { matchId } });
      const { count: deletedPredictions } = await tx.prediction.deleteMany({ where: { matchId } });
      const result = await tx.matchResult.findUnique({ where: { matchId } });
      if (result) {
        await tx.matchResult.delete({ where: { matchId } });
      }
      await tx.match.update({
        where: { id: matchId },
        data: { status: "SCHEDULED" },
      });
      return { deletedPredictions, deletedScoreEvents, deletedResult: !!result };
    });

    await createAuditLog({
      actorUserId: admin.id,
      action: "MATCH_RESET",
      entityType: "match",
      entityId: matchId,
      afterJson: { deletedPredictions, deletedScoreEvents, deletedResult },
    });

    return NextResponse.json({ ok: true, deletedPredictions, deletedScoreEvents, deletedResult });
  } catch (err) {
    console.error("[match reset] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
