import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const teamSchema = z.object({
  fifaCode: z.string().min(2).max(4).toUpperCase(),
  name: z.string().min(1),
  groupCode: z.string().optional().nullable(),
});

export async function GET() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const teams = await prisma.team.findMany({
    where: { isPlaceholder: false },
    orderBy: [{ groupCode: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await req.json();
    const data = teamSchema.parse(body);

    const team = await prisma.team.upsert({
      where: { fifaCode: data.fifaCode },
      create: { ...data, isPlaceholder: false },
      update: { name: data.name, groupCode: data.groupCode ?? null },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
