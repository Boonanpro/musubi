import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Musubi - 自律型AI開発者システム",
  description: "産霊（むすひ）: 生成・結合・調和",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

