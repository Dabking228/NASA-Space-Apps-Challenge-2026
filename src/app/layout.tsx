import type { Metadata } from 'next';
import { DisclaimerFooter } from '@/components/disclaimer-footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health Companion',
  description: 'Decision-support prototype for astronaut health.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-svh flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
        <DisclaimerFooter />
      </body>
    </html>
  );
}
