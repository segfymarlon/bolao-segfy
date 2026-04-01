import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditAction } from "@/lib/audit";

const matchSchema = z.object({
  stageId: z.string(),
  groupCode: z.string().optional().nullable(),
  matchNumber: z.number().int(),
  homeTeamId: z.string().optional().nullable(),
  awayTeamId: z.string().optional().nullable(),
  kickoffAt: z.string().datetime(),
  venue: z.string().optional().nullable(),
});

export async function GET() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const matches = await prisma.match.findMany({
    include: {
      stage: true,
      homeTeam: true,
      awayTeam: true,
      result: true,
      _count: { select: { predictions: true } },
    },
    orderBy: [{ kickoffAt: "asc" }],
  });

  return NextResponse.json({ matches });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();

  // Bulk import
  if (Array.isArray(body.matches)) {
    const created = await Promise.all(
      body.matches.map(async (m: unknown) => {
        const data = matchSchema.parse(m);
        return prisma.match.create({ data: { ...data, kickoffAt: new Date(data.kickoffAt) } });
      })
    );
    return NextResponse.json({ created: created.length }, { status: 201 });
  }

  const data = matchSchema.parse(body);
  const match = await prisma.match.create({
    data: { ...data, kickoffAt: new Date(data.kickoffAt) },
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: AuditAction.MATCH_CREATED,
    entityType: "match",
    entityId: match.id,
    afterJson: data,
  });

  return NextResponse.json({ match }, { status: 201 });
}
