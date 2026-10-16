import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/components/ui/dialog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Dinusha Embroidery – Factory Operations System (FactoryOps)",
  description: "Enterprise Production Monitoring and Factory Operations Management System for Dinusha Embroidery Pvt Ltd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-slate-50 text-slate-800 antialiased min-h-screen`}>
        <DialogProvider>
          {children}
        </DialogProvider>
      </body>
    </html>
  );
}
