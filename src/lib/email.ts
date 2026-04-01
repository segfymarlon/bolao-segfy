import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASS,
    },
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  });
}

export function magicLinkEmail(link: string, appName: string) {
  return {
    subject: `Seu acesso ao ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Acesse o ${appName}</h2>
        <p style="color:#475569">Clique no botão abaixo para entrar. O link expira em ${process.env.MAGIC_LINK_EXPIRES_MINUTES ?? 30} minutos.</p>
        <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Acessar Bolão
        </a>
        <p style="color:#94a3b8;font-size:12px">Se você não solicitou este acesso, ignore este e-mail.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px">Ou copie e cole o link: <br/>${link}</p>
      </div>
    `,
  };
}

export function otpEmail(otp: string, appName: string) {
  return {
    subject: `Seu código de acesso ao ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Código de acesso</h2>
        <p style="color:#475569">Use o código abaixo para entrar no ${appName}. Ele expira em ${process.env.OTP_EXPIRES_MINUTES ?? 15} minutos.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:16px 0">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1e293b">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px">Se você não solicitou este código, ignore este e-mail.</p>
      </div>
    `,
  };
}

export function inviteEmail(link: string, appName: string) {
  return {
    subject: `Você foi convidado para o ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Bem-vindo ao ${appName}!</h2>
        <p style="color:#475569">Você foi convidado para participar do bolão da Copa do Mundo FIFA 2026 da empresa.</p>
        <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Aceitar Convite
        </a>
        <p style="color:#94a3b8;font-size:12px">O link expira em ${process.env.MAGIC_LINK_EXPIRES_MINUTES ?? 30} minutos. Se expirar, basta acessar o sistema com seu e-mail novamente.</p>
      </div>
    `,
  };
}
