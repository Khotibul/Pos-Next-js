export function verifyEmailTemplate(params: { appName: string; verifyUrl: string; userName?: string | null }) {
  const name = params.userName?.trim() || "Anda";
  const appName = params.appName;
  const url = params.verifyUrl;

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.55; color: #0f172a;">
    <h2 style="margin: 0 0 8px;">Verifikasi Email</h2>
    <p style="margin: 0 0 14px;">Halo ${name},</p>
    <p style="margin: 0 0 14px;">
      Terima kasih sudah mendaftar di <b>${appName}</b>. Klik tombol di bawah untuk memverifikasi email Anda.
    </p>
    <p style="margin: 18px 0;">
      <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:12px;text-decoration:none;font-weight:600;">
        Verifikasi Email
      </a>
    </p>
    <p style="margin: 0 0 6px; color: #475569; font-size: 12px;">Jika tombol tidak berfungsi, copy link berikut:</p>
    <p style="margin: 0; color: #475569; font-size: 12px; word-break: break-all;">${url}</p>
  </div>
  `.trim();

  const text = `Verifikasi Email\n\nKlik link berikut untuk verifikasi:\n${url}\n`;

  return { html, text };
}

