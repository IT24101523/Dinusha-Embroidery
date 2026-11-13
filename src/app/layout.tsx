import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dinusha Embroidery',
  description: 'Factory Management System for Dinusha Embroidery Pvt Ltd',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
