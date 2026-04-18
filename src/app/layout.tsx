import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TNFD LEAP | 自然相关财务信息披露平台",
  description: "基于 LEAP 框架的自动化 TNFD v1.0 工作流 - 降低自然信息披露门槛",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
