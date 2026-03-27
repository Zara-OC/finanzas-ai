import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Finanzas AI — Tus finanzas, claras como nunca",
    template: "%s | Finanzas AI",
  },
  description:
    "Importá tus gastos, la IA los categoriza automáticamente. Preguntale a tu plata a dónde se va. Hecho para Argentina.",
  openGraph: {
    title: "Finanzas AI — Tus finanzas, claras como nunca",
    description:
      "Importá tus gastos, la IA los categoriza automáticamente. Preguntale a tu plata a dónde se va.",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
