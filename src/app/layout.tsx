import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "NEXA — Conecte-se do seu jeito",
  description: "Amizades, conversas e comunidades em um só lugar."
};
export const viewport: Viewport = { themeColor: "#7657f6", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}