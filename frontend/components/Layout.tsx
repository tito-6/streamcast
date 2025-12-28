import React, { ReactNode } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  lang?: 'ar' | 'en' | 'tr';
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'Sport Events | الحدث الرياضي | Live Football',
  description = 'Watch Live Football and Sport Events. تابع الحدث الرياضي وبث مباشر للمباريات على منصة sportevent.online. Best place for live sports streaming.',
  lang = 'ar'
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="sport events, الحدث الرياضي, live football, بث مباشر, مباريات اليوم, live sports, football streaming, كورة لايف" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="canonical" href="https://sportevent.online" />

        {/* Performance Optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Sport Events" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://sportevent.online/og-image.jpg" />
        <meta property="og:url" content="https://sportevent.online" />
        <meta property="og:locale" content={lang === 'ar' ? 'ar_AE' : 'en_US'} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://sportevent.online/og-image.jpg" />
      </Head>

      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-ZL71W70X4S"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-ZL71W70X4S');
        `}
      </Script>

      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="min-h-screen relative flex flex-col">
        {/* Geometric Background Pattern */}
        <div className="geometric-pattern" />

        {/* Main Content */}
        <div className="relative z-10 flex-1">
          <Navbar lang={lang} />
          <main className="min-h-screen">
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Layout;


