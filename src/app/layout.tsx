import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "laterlist",
  description: "Save URLs for later — enriched, tagged, and organized.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
