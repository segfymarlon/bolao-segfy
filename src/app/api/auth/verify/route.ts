import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { createAuditLog, AuditAction } from "@/lib/audit";

const schema = z.object({
  token: z.string(),
  type: z.enum(["magic_link", "otp"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, type } = schema.parse(body);

    const email = await verifyAuthToken(token, type);

    if (!email) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 401 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { email },
    });

    if (!invitation || invitation.status !== "ACCEPTED") {
      // Accept invitation on first verify if status is PENDING
      if (invitation?.status === "PENDING") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
      } else {
        return NextResponse.json(
          { error: "Acesso não autorizado" },
          { status: 403 }
        );
      }
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: invitation!.role,
          invitationId: invitation!.id,
          lastLoginAt: new Date(),
        },
      });

      if (invitation?.status === "PENDING") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    await createAuditLog({
      actorUserId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: "user",
      entityId: user.id,
      afterJson: { email, type },
    });

    const sessionToken = await createSession(user.id);

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
