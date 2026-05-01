import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" data-theme="dark" suppressHydrationWarning>
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Real-time AI Voice Agent Interview Platform — Practice interviews with your voice, get instant AI feedback, and land the job." />
        <meta property="og:title" content="Real-time AI Voice Agent Interview Platform" />
        <meta property="og:description" content="Practice real interview questions, speak your answers, get instant AI feedback. The most advanced AI voice interview platform." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎙️</text></svg>" />
        {/* Inline script to prevent theme flash before React loads */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var t = localStorage.getItem('vp-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            })();
          `
        }} />
      </Head>
      <body suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
