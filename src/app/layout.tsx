import type { Metadata } from 'next';
import './globals.css';
import { DialogProvider } from '@/components/system/dialog-provider';

export const metadata: Metadata = {
  title: 'Dinusha Embroidery — FactoryOps',
  description: 'Factory Operations Management System for Dinusha Embroidery Pvt Ltd',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <DialogProvider>
          {children}
        </DialogProvider>
      </body>
    </html>
  );
}
