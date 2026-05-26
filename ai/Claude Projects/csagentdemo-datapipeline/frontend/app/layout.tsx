import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ServerCo Customer Service",
  description: "AI-powered customer service agent for Server Hardware RMA requests",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface text-text-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
