import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginLayout({ children }) {
  return (
    <AuthShell
      variant="login"
      heroSide="left"
      topText="Belum punya akun?"
      topLinkHref="/register"
      topLinkLabel="Daftar Akun Baru"
    >
      {children}
    </AuthShell>
  );
}
