import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinAegis — AI-Powered Financial Advisor",
  description:
    "Privacy-first financial advisory powered by local AI. Passwordless auth, encrypted data, explainable insights.",
  keywords: ["finance", "AI", "budgeting", "passkey", "privacy", "WebAuthn"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-animated min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
