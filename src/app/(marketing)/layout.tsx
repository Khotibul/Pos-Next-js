import { SiteHeader } from "@/components/layout/site-header";
import { MarketingBottomNav } from "@/components/layout/marketing-bottom-nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <SiteHeader />
      {children}
      <MarketingBottomNav />
    </div>
  );
}

