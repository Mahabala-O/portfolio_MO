import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <meta name="robots" content="follow, index" />
        <meta property="og:site_name" content="Mikhail Orlov" />
        <meta name="twitter:card" content="summary" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fafafa"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#111111"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
