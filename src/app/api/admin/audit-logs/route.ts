import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 50);
  const entityType = searchParams.get("entityType");

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: entityType ? { entityType } : {},
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where: entityType ? { entityType } : {} }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
