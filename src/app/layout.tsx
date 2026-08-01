import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://reyon-online.vercel.app"),
  title: { default: "REYON — Beauty, considered", template: "%s | REYON" },
  description:
    "A premium Beauty & Care destination built around trust, clarity and thoughtful rituals.",
  openGraph: {
    title: "REYON — Beauty, considered",
    description: "Thoughtful beauty, selected with care.",
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
