import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Presentation Studio — Министерство промышленности РБ",
  description: "Генерация структурированных презентаций из официальных справок",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="app-shell">{children}</body>
    </html>
  );
}
