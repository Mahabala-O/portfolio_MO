import 'nextra-theme-blog/style.css'
import Head from 'next/head'
import { ThemeProvider } from 'next-themes'

import SiteHeader from '../components/site-header'
import StructuredData from '../components/structured-data'
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
          rel="alternate"
          type="text/markdown"
          title="Summary for AI assistants"
          href="/llms.txt"
        />
        <link
          rel="alternate"
          type="text/markdown"
          title="Full site text for AI assistants"
          href="/llms-full.txt"
        />
        <link
          rel="alternate"
          type="application/json"
          title="Resume (JSON Resume)"
          href="/resume.json"
        />
        <link
          rel="preload"
          href="/fonts/Inter-roman.latin.var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
      <StructuredData />
      <SiteHeader />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
