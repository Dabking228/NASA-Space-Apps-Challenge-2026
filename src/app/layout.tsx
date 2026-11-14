import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health Companion',
  description: 'Decision-support prototype for astronaut health.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
