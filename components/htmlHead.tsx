import Head from 'next/head';

export default function HtmlHead({
  title = 'OurShift',
  description = 'Das einfache Schichtplan Tool',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />

      {/* PWA */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="OurShift" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      <link rel="manifest" href="/site.webmanifest" />
      <meta name="theme-color" content="#0ea5e9" />

      {/* Apple Touch Icon – canonical */}
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />

      {/* Social */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content="https://www.ourshift.de/logo-og.jpg" />
      <meta property="og:image:width" content="1000" />
      <meta property="og:image:height" content="500" />
      <meta property="og:image:alt" content="OurShift - Logo" />
      <meta property="og:url" content="https://www.ourshift.de/" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta
        name="twitter:image"
        content="https://www.ourshift.de/logo-og.jpg"
      />
      <link rel="canonical" href="https://www.ourshift.de/" />

      {/* (Optional, iOS Web-App Look) */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </Head>
  );
}
