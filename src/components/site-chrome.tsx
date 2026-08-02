"use client";

import { usePathname } from "next/navigation";
import { BackNavigation } from "@/components/back-navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <Header />
      <BackNavigation />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
