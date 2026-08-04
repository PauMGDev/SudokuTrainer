import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { copy } from '../copy';
import './globals.css';

/**
 * Las tres familias de paumiquel.com. `next/font` las descarga en build y las
 * sirve desde el propio dominio: el portfolio las pide a Google en cada visita,
 * aquí no — una petición menos y ningún salto de tipografía al cargar.
 */
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
