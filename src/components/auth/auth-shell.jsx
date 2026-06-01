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
  const mainAlign = variant === "register" ? "items-start xl:pt-8" : "items-center";
  const formPlacement = isHeroRight
    ? "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2"
    : "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2";
  const heroPlacement = isHeroRight
    ? "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
    : "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2";
  const mainPaddingY = variant === "register" ? "lg:py-8 xl:py-10" : "lg:py-12 xl:py-16";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff,#f4f7ff_45%,#ffffff)]">
      <div className="grid min-h-screen lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch">
        <section
          className={[
            "flex min-h-screen flex-col bg-background/78 backdrop-blur-xl lg:h-screen lg:min-h-0 lg:overflow-y-auto",
            formPlacement,
          ].join(" ")}
        >
          <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:-rotate-3 group-hover:scale-105">
                PP
              </span>
              <span className="grid leading-none">
                <span className="text-xl font-black tracking-[-0.045em] text-primary">PointPro POS</span>
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:block">
                  Retail SaaS
                </span>
              </span>
            </Link>
            <div className="shrink-0 text-right text-xs font-medium text-muted-foreground sm:text-sm">
              {topText}{" "}
              <Link className="font-bold text-primary hover:underline" href={topLinkHref}>
                {topLinkLabel}
              </Link>
            </div>
          </header>

          <main className={["flex flex-1 justify-center px-5 py-8 sm:px-8 lg:justify-center lg:px-12 xl:px-16", mainPaddingY, mainAlign].join(" ")}>
            <div className={variant === "register" ? "w-full max-w-[560px]" : "w-full max-w-[430px]"}>
              {children}
            </div>
          </main>

          <footer className="mt-auto flex flex-wrap items-center justify-center gap-3 border-t bg-background/70 px-5 py-4 text-center text-xs text-muted-foreground sm:justify-between sm:px-8 lg:px-10">
            <div>{"\u00A9"} {year} PointPro POS. All rights reserved.</div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
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
