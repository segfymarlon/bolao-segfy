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

  const events = await prisma.scoreEvent.findMany({
    where: {
      userId: session.id,
      ...(stage ? { match: { stage: { code: stage } } } : {}),
    },
    include: {
      match: {
        include: { stage: true, homeTeam: true, awayTeam: true, result: true },
      },
      prediction: true,
    },
    orderBy: { match: { kickoffAt: "asc" } },
  });

  const total = events.reduce((sum, e) => sum + e.pointsTotal, 0);

  return NextResponse.json({ events, total });
}
