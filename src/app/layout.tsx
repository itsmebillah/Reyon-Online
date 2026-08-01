import type { Metadata } from "next";
import { BackNavigation } from "@/components/back-navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { businessConfig } from "@/config/business";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(businessConfig.productionUrl),
  title: {
    default: "REYON — Authentic Korean Beauty & Personal Care",
    template: "%s | REYON",
  },
  description: businessConfig.positioning,
  openGraph: {
    title: "REYON — Authentic Korean Beauty & Personal Care",
    description: businessConfig.positioning,
    type: "website",
    siteName: "REYON",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <BackNavigation />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
