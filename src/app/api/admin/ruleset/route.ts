import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditAction } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(3),
  contentMd: z.string().min(10),
  scoringJson: z.object({}).passthrough(),
  effectiveFrom: z.string().datetime(),
  activate: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const data = schema.parse(body);

  const lastVersion = await prisma.ruleset.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const version = (lastVersion?.version ?? 0) + 1;

  const ruleset = await prisma.$transaction(async (tx) => {
    if (data.activate) {
      await tx.ruleset.updateMany({ data: { isActive: false } });
    }
    return tx.ruleset.create({
      data: {
        version,
        title: data.title,
        contentMd: data.contentMd,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scoringJson: data.scoringJson as any,
        effectiveFrom: new Date(data.effectiveFrom),
        isActive: data.activate,
        createdBy: admin.id,
      },
    });
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: AuditAction.RULESET_PUBLISHED,
    entityType: "ruleset",
    entityId: ruleset.id,
    afterJson: { version, title: data.title, activate: data.activate },
  });

  return NextResponse.json({ ruleset }, { status: 201 });
}
