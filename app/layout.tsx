import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/app/providers";
import { ANALYTICS_CONSENT_INIT_SCRIPT } from "@/lib/analytics/consent";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "data.janta.party",
  description: "Volunteer with data.janta.party.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html id="root-html" lang="en" suppressHydrationWarning>
      <head id="tpl-app-layout-head">
        <script
          id="tpl-app-layout-locale-bootstrap"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('locale');if(l==='en'||l==='hi'){document.documentElement.lang=l;}}catch(e){}})();`,
          }}
        />
        <script
          id="tpl-app-layout-analytics-consent-bootstrap"
          dangerouslySetInnerHTML={{
            __html: ANALYTICS_CONSENT_INIT_SCRIPT,
          }}
        />
      </head>
      <body
        id="root-body"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
