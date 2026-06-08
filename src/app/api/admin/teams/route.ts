import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const teams = await prisma.team.findMany({
    where: { isPlaceholder: false },
    orderBy: [{ groupCode: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ teams });
}
