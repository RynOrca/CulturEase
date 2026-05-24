'use client';

import { Noto_Serif_SC } from 'next/font/google';
import { usePathname } from 'next/navigation';
import './globals.css';
import { NavBar } from '@/components/ui/NavBar';
import { Footer } from '@/components/ui/Footer';

const notoSerifSC = Noto_Serif_SC({
  variable: '--font-noto-serif-sc',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = pathname === '/setup';

  return (
    <html lang="zh-CN" className={`${notoSerifSC.variable} h-full`}>
      <body className={`min-h-full flex flex-col text-ink antialiased ${isFullscreen ? 'bg-[#0d1016] h-screen overflow-hidden' : 'bg-parchment'}`}>
        {!isFullscreen && <NavBar />}
        <main className={isFullscreen ? 'h-screen' : 'flex-1'}>{children}</main>
        {!isFullscreen && <Footer />}
      </body>
    </html>
  );
}
