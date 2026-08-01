import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { businessConfig } from "@/config/business";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(businessConfig.productionUrl),
  title: { default: "REYON — Beauty, considered", template: "%s | REYON" },
  description:
    "REYON is a premium multi-brand Beauty & Care retailer built around trust, clarity and thoughtful selection.",
  openGraph: {
    title: "REYON — Beauty, considered",
    description:
      "Premium multi-brand beauty and personal care, selected with care.",
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
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
