import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditAction } from "@/lib/audit";

const updateSchema = z.object({
  kickoffAt: z.string().datetime().optional(),
  venue: z.string().optional().nullable(),
  homeTeamId: z.string().optional().nullable(),
  awayTeamId: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]).optional(),
  groupCode: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });

  const match = await prisma.match.update({
    where: { id },
    data: {
      ...data,
      ...(data.kickoffAt ? { kickoffAt: new Date(data.kickoffAt) } : {}),
    },
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: AuditAction.MATCH_UPDATED,
    entityType: "match",
    entityId: id,
    beforeJson: existing,
    afterJson: data,
  });

  return NextResponse.json({ match });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });

  const predCount = await prisma.prediction.count({ where: { matchId: id } });
  if (predCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: há ${predCount} palpite(s) registrado(s). Use Reset primeiro.` },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.scoreEvent.deleteMany({ where: { matchId: id } });
    await tx.matchResult.deleteMany({ where: { matchId: id } });
    await tx.match.delete({ where: { id } });
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "MATCH_DELETED",
    entityType: "match",
    entityId: id,
    beforeJson: existing,
  });

  return NextResponse.json({ ok: true });
}
