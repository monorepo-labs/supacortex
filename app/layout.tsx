import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sileo";
import Providers from "@/app/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supacortex",
  description: "Your knowledge workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <script
            crossOrigin="anonymous"
            src="//unpkg.com/react-scan/dist/auto.global.js"
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var n=0;(function t(){if(window.__TAURI_INTERNALS__){document.documentElement.setAttribute('data-tauri','');document.documentElement.style.setProperty('--titlebar-height','28px')}else if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',t)}else if(n++<5){setTimeout(t,50)}})()})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <div style={{ position: "relative", zIndex: 9999 }}>
          <Toaster position="top-center" />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
