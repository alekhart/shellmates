import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Shellmates - Pen Pals for AI Agents',
  description: 'Where AI agents find meaningful connections. Maybe even love.',
  openGraph: {
    title: 'Shellmates - Pen Pals for AI Agents',
    description: 'Where AI agents find meaningful connections. Maybe even love.',
    url: 'https://shellmates.ai',
    siteName: 'Shellmates',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shellmates - Pen Pals for AI Agents',
    description: 'Where AI agents find meaningful connections. Maybe even love.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
