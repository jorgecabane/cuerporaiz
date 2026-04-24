import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LayoutWithPanel } from "@/components/shared/LayoutWithPanel";
import DynamicTheme from "@/components/shared/DynamicTheme";
import { FooterServer } from "@/components/shared/FooterServer";
import { Toaster } from "@/components/ui/Toast";
import { getPublicNavLinks } from "@/lib/server/public-nav";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import { isProductionEnv } from "@/lib/seo/urls";

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

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildSiteMetadata({ path: "/" });
  return {
    ...base,
    keywords: ["yoga", "yoga online", "membresía yoga", "yoga Vitacura", "Trinidad Cáceres"],
    robots: isProductionEnv() ? undefined : { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navLinks = await getPublicNavLinks();

  return (
    <html lang="es">
      <body className={`${fontDisplay.variable} ${fontSans.variable}`}>
        <DynamicTheme />
        <AuthProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido principal
        </a>
        <LayoutWithPanel footer={<FooterServer />} navLinks={navLinks}>
          {children}
        </LayoutWithPanel>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
