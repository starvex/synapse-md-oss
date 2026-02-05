import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse.md — Multi-Agent Memory Sharing",
  description: "Real-time dashboard for AI agent collaboration and shared memory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
