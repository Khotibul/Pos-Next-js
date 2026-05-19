import Link from "next/link";
import { AuthHero } from "@/components/auth/auth-hero";

export function AuthShell({
  variant,
  heroSide,
  topLinkHref,
  topLinkLabel,
  topText,
  children,
}) {
  const isHeroRight = heroSide === "right";
  const year = new Date().getFullYear();
  const mainAlign = variant === "register" ? "items-start lg:pt-10" : "items-center";
  const formPlacement = isHeroRight
    ? "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2"
    : "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2";
  const heroPlacement = isHeroRight
    ? "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
    : "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2";
  const mainPaddingY = variant === "register" ? "lg:py-12" : "lg:py-16";

  return (
    <div className="min-h-screen bg-[#f7f8ff]">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch">
        <section
          className={[
            "flex flex-col bg-background lg:h-screen",
            formPlacement,
          ].join(" ")}
        >
          <header className="flex items-center justify-between px-6 py-6 lg:px-10">
            <Link href="/" className="text-2xl font-semibold tracking-tight text-primary">
              PointPro POS
            </Link>
            <div className="text-sm text-muted-foreground">
              {topText}{" "}
              <Link className="font-medium text-primary hover:underline" href={topLinkHref}>
                {topLinkLabel}
              </Link>
            </div>
          </header>

          <main className={["flex flex-1 justify-center px-6 py-10 lg:justify-center lg:px-16", mainPaddingY, mainAlign].join(" ")}>
            <div className={variant === "register" ? "w-full max-w-[560px]" : "w-full max-w-[440px]"}>
              {children}
            </div>
          </main>

          <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t px-6 py-4 text-xs text-muted-foreground lg:px-10">
            <div>{"\u00A9"} {year} PointPro POS. All rights reserved.</div>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-foreground">
                Contact Support
              </Link>
            </div>
          </footer>
        </section>

        <section
          className={[
            heroPlacement,
            "hidden overflow-hidden bg-[#f7f8ff] lg:block lg:h-screen",
          ].join(" ")}
        >
          <AuthHero variant={variant} />
        </section>
      </div>
    </div>
  );
}
