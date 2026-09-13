import type { Metadata } from "next";
import { SiteChrome } from "@/components/site-chrome";
import { businessConfig } from "@/config/business";
import "./globals.css";
import "./watch.css";

export const metadata: Metadata = {
  metadataBase: new URL(businessConfig.productionUrl),
  title: {
    default: "REYON — Watches in Bangladesh",
    template: "%s | REYON",
  },
  description: businessConfig.positioning,
  openGraph: {
    title: "REYON — Watches in Bangladesh",
    description: businessConfig.positioning,
    type: "website",
    siteName: "REYON",
    images: [
      {
        url: "/images/watch-hero.webp",
        width: 1536,
        height: 1024,
        alt: "REYON watches",
      },
    ],
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
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
