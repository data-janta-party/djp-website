import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'data.janta.party',
  description: 'Volunteer with data.janta.party.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html id="root-html" lang="en" suppressHydrationWarning>
      <head id="tpl-app-layout-l28-c7">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('locale');if(l==='en'||l==='hi'){document.documentElement.lang=l;}}catch(e){}})();`,
          }} id="tpl-app-layout-l29-c9"
        />
      </head>
      <body
        id="root-body"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
