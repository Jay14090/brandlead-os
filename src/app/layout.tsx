import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandLead OS — Lead Generation & Verification",
  description: "AI-powered lead generation and verification platform for branding, marketing, and AI workflow agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
