import 'nextra-theme-blog/style.css'
import Head from 'next/head'
import { ThemeProvider } from 'next-themes'

import SiteHeader from '../components/site-header'
import '../styles/main.css'

export default function Nextra({ Component, pageProps }) {
  return (
    // Same settings as nextra-theme-blog's provider, which defers to this one
    // when nested, so the header toggle and the theme share one state.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS"
          href="/feed.xml"
        />
        <link
          rel="preload"
          href="/fonts/Inter-roman.latin.var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
      <SiteHeader />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
