import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'nextra/icons'
import { useEffect, useState } from 'react'

import { SITE } from '../lib/site'

const NAV = [
  { href: '/', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/resume', label: 'Resume' }
]

function isActive(pathname, href) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

export default function SiteHeader() {
  const { pathname } = useRouter()

  return (
    <header className="site-header">
      <Link href="/" className="site-name">
        {SITE.name}
        <span className="site-role">{SITE.role}</span>
      </Link>
      <nav aria-label="Main">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </header>
  )
}
