import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMagicLinkToken, hashToken } from "@/lib/tokens";
import { sendEmail, inviteEmail } from "@/lib/email";
import { createAuditLog, AuditAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

  if (action === "revoke") {
    await prisma.invitation.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    // Disable user if exists
    const user = await prisma.user.findFirst({ where: { invitationId: id } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { status: "disabled" } });
    }
    await createAuditLog({
      actorUserId: admin.id,
      action: AuditAction.INVITE_REVOKED,
      entityType: "invitation",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "resend") {
    const token = await createMagicLinkToken(invitation.email);
    const tokenHash = hashToken(token);
    await prisma.invitation.update({
      where: { id },
      data: { tokenHash, status: "PENDING" },
    });

    const appName = process.env.APP_NAME ?? "Bolão Copa 2026";
    const link = `${process.env.APP_URL}/auth/verify?token=${token}&type=magic_link`;
    const { subject, html } = inviteEmail(link, appName);
    await sendEmail({ to: invitation.email, subject, html });

    await createAuditLog({
      actorUserId: admin.id,
      action: AuditAction.INVITE_RESENT,
      entityType: "invitation",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
