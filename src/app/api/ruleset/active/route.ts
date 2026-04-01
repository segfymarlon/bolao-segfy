import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const ruleset = await prisma.ruleset.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  if (!ruleset) {
    return NextResponse.json({ error: "Regulamento não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ruleset });
}
