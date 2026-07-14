import type {Metadata} from 'next';
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Asteria Studio',
  description: 'Local visual AI workspace',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${hanken.variable} ${jetbrains.variable}`}>
      <body className="bg-[#020303] text-on-background font-body-sm h-[100dvh] flex flex-col overflow-hidden selection:bg-primary-container selection:text-on-primary-container" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
