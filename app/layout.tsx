import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Netplay 참석 투표 - 윤",
  description: "배드민턴 모임 참석 투표 시스템",

  openGraph: {
    title: "Netplay 참석 투표 - 윤",
    description: "배드민턴 모임 참석 투표 시스템",
    url: "https://netplay-vote-yoon.vercel.app",
    siteName: "Netplay 참석 투표",
    images: [
      {
        url: "/og-image.jpg",  // ← 여기! 새 이미지 파일 적용됨
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Netplay 참석 투표 - 윤",
    description: "배드민턴 모임 참석 투표 시스템",
    images: ["/og-image.jpg"], // ← 트위터 카드도 동일하게 적용
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
