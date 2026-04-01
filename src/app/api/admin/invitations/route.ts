import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMagicLinkToken } from "@/lib/tokens";
import { sendEmail, inviteEmail } from "@/lib/email";
import { createAuditLog, AuditAction } from "@/lib/audit";
import { hashToken } from "@/lib/tokens";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "PARTICIPANT"]).default("PARTICIPANT"),
});

const bulkSchema = z.object({
  emails: z.array(z.string().email()),
  role: z.enum(["ADMIN", "PARTICIPANT"]).default("PARTICIPANT"),
});

export async function GET() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const invitations = await prisma.invitation.findMany({
    include: { user: { select: { id: true, name: true, lastLoginAt: true } } },
    orderBy: { invitedAt: "desc" },
  });

  return NextResponse.json({ invitations });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();

  // Handle bulk invite
  if (Array.isArray(body.emails)) {
    const { emails, role } = bulkSchema.parse(body);
    const results = await Promise.allSettled(
      emails.map((email) => inviteSingle(email.toLowerCase(), role, admin.id))
    );
    return NextResponse.json({
      results: results.map((r, i) => ({
        email: emails[i],
        ok: r.status === "fulfilled",
        error: r.status === "rejected" ? String(r.reason) : undefined,
      })),
    });
  }

  const { email, role } = createSchema.parse(body);
  const invitation = await inviteSingle(email.toLowerCase(), role, admin.id);
  return NextResponse.json({ invitation }, { status: 201 });
}

async function inviteSingle(email: string, role: "ADMIN" | "PARTICIPANT", invitedBy: string) {
  const existing = await prisma.invitation.findUnique({ where: { email } });
  if (existing && existing.status !== "REVOKED") {
    throw new Error(`Convite já existe para ${email}`);
  }

  const token = await createMagicLinkToken(email);
  const tokenHash = hashToken(token);
  const appName = process.env.APP_NAME ?? "Bolão Copa 2026";
  const link = `${process.env.APP_URL}/auth/verify?token=${token}&type=magic_link`;

  let invitation;
  if (existing?.status === "REVOKED") {
    invitation = await prisma.invitation.update({
      where: { id: existing.id },
      data: { status: "PENDING", invitedBy, invitedAt: new Date(), tokenHash, revokedAt: null, acceptedAt: null },
    });
  } else {
    invitation = await prisma.invitation.create({
      data: { email, role, status: "PENDING", invitedBy, tokenHash },
    });
  }

  const { subject, html } = inviteEmail(link, appName);
  await sendEmail({ to: email, subject, html });

  await createAuditLog({
    actorUserId: invitedBy,
    action: AuditAction.INVITE_CREATED,
    entityType: "invitation",
    entityId: invitation.id,
    afterJson: { email, role },
  });

  return invitation;
}
