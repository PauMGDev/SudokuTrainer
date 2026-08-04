import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { copy } from '../copy';
import './globals.css';

/**
 * Dos de las tres familias de paumiquel.com; la serif del portfolio no entra
 * porque aquí no hay portada editorial que sostener. `next/font` las descarga
 * en build y las sirve desde el propio dominio: el portfolio se las pide a
 * Google en cada visita, esto no — una petición menos y ningún salto al cargar.
 */
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
