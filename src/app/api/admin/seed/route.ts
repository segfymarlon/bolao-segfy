import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Quick endpoint to create group stage matches for demo
export async function POST() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const groupStage = await prisma.stage.findUnique({ where: { code: "GROUP" } });
  if (!groupStage) return NextResponse.json({ error: "Stage GROUP not found" }, { status: 404 });

  const teams = await prisma.team.findMany({ where: { isPlaceholder: false } });
  const grouped = new Map<string, typeof teams>();
  for (const t of teams) {
    if (!t.groupCode) continue;
    if (!grouped.has(t.groupCode)) grouped.set(t.groupCode, []);
    grouped.get(t.groupCode)!.push(t);
  }

  let matchNumber = 1;
  const baseDate = new Date("2026-06-11T18:00:00Z");

  for (const [, groupTeams] of grouped.entries()) {
    if (groupTeams.length !== 4) continue;
    const pairs = [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ];
    for (const [hi, ai] of pairs) {
      const kickoff = new Date(baseDate.getTime() + matchNumber * 3 * 60 * 60 * 1000);
      await prisma.match.upsert({
        where: { externalId: `GROUP_${matchNumber}` },
        create: {
          externalId: `GROUP_${matchNumber}`,
          stageId: groupStage.id,
          groupCode: groupTeams[0].groupCode,
          matchNumber,
          homeTeamId: groupTeams[hi].id,
          awayTeamId: groupTeams[ai].id,
          kickoffAt: kickoff,
          venue: "TBD",
        },
        update: {},
      });
      matchNumber++;
    }
  }

  return NextResponse.json({ ok: true, matchesCreated: matchNumber - 1 });
}
