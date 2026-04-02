import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createMagicLinkToken } from "@/lib/tokens";
import { sendEmail, magicLinkEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const emailLower = email.toLowerCase().trim();

    const invitation = await prisma.invitation.findUnique({
      where: { email: emailLower },
    });

    // Always return 200 to avoid email enumeration
    if (!invitation || invitation.status !== "ACCEPTED") {
      return NextResponse.json({ ok: true });
    }

    const token = await createMagicLinkToken(emailLower);
    const link = `${process.env.APP_URL}/auth/verify?token=${token}&type=magic_link`;

    const appName = process.env.APP_NAME ?? "Bolão Copa 2026";
    const { subject, html } = magicLinkEmail(link, appName);

    await sendEmail({ to: emailLower, subject, html });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[request-link] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro interno", detail: message }, { status: 500 });
  }
}
