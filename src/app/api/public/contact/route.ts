import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/smtp";

export const runtime = "nodejs";

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(4000),
});

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: "Invalid form data" }, { status: 400 });

  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Validasi gagal", issues: parsed.error.flatten() }, { status: 400 });
  }

  const to = process.env.CONTACT_TO || process.env.EMAIL_FROM || "";
  if (!to) return NextResponse.json({ ok: false, message: "CONTACT_TO/EMAIL_FROM belum di-set" }, { status: 400 });

  const { name, email, subject, message } = parsed.data;
  const safe = (v: string) => v.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  await sendEmail({
    to,
    subject: `[POSify] ${subject}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <h2 style="margin:0 0 12px;">New contact message</h2>
        <p style="margin:0 0 12px;"><b>From</b>: ${safe(name)} &lt;${safe(email)}&gt;</p>
        <p style="margin:0 0 12px;"><b>Subject</b>: ${safe(subject)}</p>
        <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:0;">${safe(message)}</pre>
      </div>
    `.trim(),
  });

  return NextResponse.redirect(new URL("/about?sent=1", req.url), { status: 303 });
}

