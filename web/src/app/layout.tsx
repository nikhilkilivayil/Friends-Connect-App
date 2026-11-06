import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Friends Connect — Random Audio & Video Calls, Celebrities & Events',
  description:
    'Multi-platform social discovery with 1-tap Random Friend Audio & Video calls, Celebrity Audio & Video calling, Location-based Event Ticketing, Customer Care Support, and Super Admin Control.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <body className="min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
