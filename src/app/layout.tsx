import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoTasksKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ['300', '400', '500', '700'],
  variable: "--font-noto-sans-kr"
});

export const metadata: Metadata = {
  title: "PaperHub - 스마트 연구 워크스페이스",
  description: "연구자들을 위한 스마트한 길잡이, PaperHub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoTasksKr.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
