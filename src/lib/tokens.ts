import crypto from "crypto";
import { prisma } from "./prisma";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createMagicLinkToken(email: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() +
      Number(process.env.MAGIC_LINK_EXPIRES_MINUTES ?? 30) * 60 * 1000
  );

  // Invalidate previous tokens for this email
  await prisma.authToken.updateMany({
    where: { email, type: "magic_link", usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: { email, tokenHash, type: "magic_link", expiresAt },
  });

  return token;
}

export async function createOTPToken(email: string): Promise<string> {
  const otp = generateOTP();
  const tokenHash = hashToken(otp);
  const expiresAt = new Date(
    Date.now() +
      Number(process.env.OTP_EXPIRES_MINUTES ?? 15) * 60 * 1000
  );

  await prisma.authToken.updateMany({
    where: { email, type: "otp", usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: { email, tokenHash, type: "otp", expiresAt },
  });

  return otp;
}

export async function verifyAuthToken(
  rawToken: string,
  type: "magic_link" | "otp"
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.authToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return null;
  if (record.type !== type) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.email;
}
