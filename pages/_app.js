import 'nextra-theme-blog/style.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

import '../styles/main.css'

export default function Nextra({ Component, pageProps }) {
  const { pathname } = useRouter()

  return (
    <>
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
      {pathname !== '/' && (
        <header className="site-header">
          <Link href="/">Mikhail Orlov</Link>
        </header>
      )}
      <Component {...pageProps} />
    </>
  )
}
