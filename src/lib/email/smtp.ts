import "server-only";

import { Errors } from "@/lib/errors";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secureRaw = process.env.SMTP_SECURE;
  const from = process.env.EMAIL_FROM;

  const port = portRaw ? Number(portRaw) : 587;
  const secure = secureRaw ? secureRaw === "true" : port === 465;

  return { host, port, user, pass, secure, from };
}

export async function sendEmail(input: SendEmailInput) {
  const { host, port, user, pass, secure, from } = getSmtpConfig();

  if (!from) throw Errors.badRequest("EMAIL_FROM belum di-set.");

  // Allow dev to run without SMTP configured.
  if (!host || !user || !pass) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] SMTP belum dikonfigurasi. Email tidak terkirim. Preview:");
      console.warn({ to: input.to, subject: input.subject });
      return;
    }
    if (!host) throw Errors.badRequest("SMTP_HOST belum di-set.");
    if (!user) throw Errors.badRequest("SMTP_USER belum di-set.");
    if (!pass) throw Errors.badRequest("SMTP_PASS belum di-set.");
  }

  // nodemailer is CJS; use dynamic import for ESM compatibility.
  const nodemailer = (await import("nodemailer")).default;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown SMTP error";
    throw Errors.badRequest(`Gagal mengirim email verifikasi. ${msg}`.trim());
  }
}

