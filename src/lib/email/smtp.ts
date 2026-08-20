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
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const secureRaw = process.env.SMTP_SECURE;
  const from = process.env.EMAIL_FROM || user;

  const port = portRaw ? Number(portRaw) : 587;
  const secure = secureRaw ? secureRaw === "true" : port === 465;

  return { host, port, user, pass, secure, from };
}

function hasSmtpConfig() {
  const { host, user, pass } = getSmtpConfig();
  return Boolean(host && user && pass);
}

function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.EMAIL_FROM || "POS Pro <onboarding@resend.dev>",
  };
}

function hasResendConfig() {
  return Boolean(getResendConfig().apiKey);
}

async function sendViaResend(apiKey: string, from: string, input: SendEmailInput) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text ?? undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let hint = "";
    if (res.status === 403 || res.status === 401) {
      hint = " Cek RESEND_API_KEY. Untuk mode sandbox, email tujuan harus email akun Resend yang sudah diverifikasi.";
    } else if (res.status === 422 && body.includes("from")) {
      hint = " EMAIL_FROM harus menggunakan domain yang sudah diverifikasi di Resend.";
    }
    throw Errors.badRequest(`Gagal mengirim email verifikasi. Resend ${res.status}: ${body.slice(0, 300)}${hint}`);
  }
}

async function sendViaSmtp(input: SendEmailInput) {
  const { host, port, user, pass, secure, from } = getSmtpConfig();

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
    const hint = /535|Invalid login|BadCredentials/i.test(msg)
      ? " SMTP_PASS (Gmail App Password) ditolak. Buat App Password baru di https://myaccount.google.com/apppasswords lalu perbarui SMTP_PASS."
      : "";
    throw Errors.badRequest(`Gagal mengirim email verifikasi. ${msg}${hint}`.trim());
  }
}

export async function sendEmail(input: SendEmailInput) {
  // Provider priority: Resend (jika RESEND_API_KEY ada) -> SMTP.
  if (hasResendConfig()) {
    const { apiKey, from } = getResendConfig();
    await sendViaResend(apiKey, from, input);
    return;
  }

  const { from } = getSmtpConfig();
  if (!from) throw Errors.badRequest("EMAIL_FROM atau SMTP_USER belum di-set.");

  // Allow dev to run without email provider configured.
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] SMTP/Resend belum dikonfigurasi. Email tidak terkirim. Preview:");
      console.warn({ to: input.to, subject: input.subject });
      return;
    }
    const { host, user, pass } = getSmtpConfig();
    if (!host) throw Errors.badRequest("SMTP_HOST belum di-set. Contoh Gmail: smtp.gmail.com.");
    if (!user) throw Errors.badRequest("SMTP_USER belum di-set.");
    if (!pass) throw Errors.badRequest("SMTP_PASS belum di-set. Untuk Gmail gunakan App Password, bukan password akun.");
  }

  await sendViaSmtp(input);
}
