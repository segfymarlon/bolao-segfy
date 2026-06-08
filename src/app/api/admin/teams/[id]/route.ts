import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  groupCode: z.string().optional().nullable(),
  fifaCode: z.string().min(2).max(4).toUpperCase().optional(),
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

  const team = await prisma.team.update({ where: { id }, data });
  return NextResponse.json({ team });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  const matchCount = await prisma.match.count({
    where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
  });
  if (matchCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: seleção está vinculada a ${matchCount} partida(s).` },
      { status: 409 }
    );
  }

  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
