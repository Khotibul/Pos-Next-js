import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterLayout({ children }) {
  return (
    <AuthShell
      variant="register"
      heroSide="right"
      topText="Sudah punya akun?"
      topLinkHref="/login"
      topLinkLabel="Masuk"
    >
      {children}
    </AuthShell>
  );
}

