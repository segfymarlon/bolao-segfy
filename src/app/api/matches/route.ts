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
  const group = searchParams.get("group");

  const matches = await prisma.match.findMany({
    where: {
      ...(stage ? { stage: { code: stage } } : {}),
      ...(group ? { groupCode: group } : {}),
      status: { notIn: ["CANCELLED"] },
    },
    include: {
      stage: true,
      homeTeam: true,
      awayTeam: true,
      result: true,
      predictions: {
        where: { userId: session.id },
        select: {
          id: true,
          homeGoalsPred: true,
          awayGoalsPred: true,
          qualifiedTeamId: true,
          status: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
  });

  return NextResponse.json({ matches });
}
