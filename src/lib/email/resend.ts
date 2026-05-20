import "server-only";

import { Errors } from "@/lib/errors";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] RESEND_API_KEY / EMAIL_FROM belum di-set. Email tidak terkirim. Preview:");
      console.warn({ to: input.to, subject: input.subject });
      return;
    }
    if (!apiKey) throw Errors.badRequest("RESEND_API_KEY belum di-set.");
    if (!from) throw Errors.badRequest("EMAIL_FROM belum di-set.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw Errors.badRequest(`Gagal mengirim email verifikasi. ${err}`.trim());
  }
}
