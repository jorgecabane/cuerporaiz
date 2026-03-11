import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";

const fontDisplay = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const fontSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Cuerpo Raíz — cuerpo, respiración y placer",
  description:
    "Yoga con identidad. Clases presenciales y online, membresía, retiros. El camino de regreso a ti. Trinidad Cáceres — Vitacura, Chile.",
  keywords: ["yoga", "yoga online", "membresía yoga", "yoga Vitacura", "Trinidad Cáceres"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${fontDisplay.variable} ${fontSans.variable}`}>
        <AuthProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido principal
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
