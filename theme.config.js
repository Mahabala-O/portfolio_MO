import { LINKS, SITE, formatMonthYear } from './lib/site'

const YEAR = new Date().getFullYear()

// Markdown images open full size in a new tab, so detailed charts stay readable.
function ZoomableImage({ src, alt, ...props }) {
  const href = typeof src === 'string' ? src : src?.src
  return (
    <a href={href} target="_blank" rel="noreferrer" className="zoomable">
      <img src={href} alt={alt} {...props} />
    </a>
  )
}

export default {
  darkMode: true,
  titleSuffix: ` – ${SITE.name}`,
  readMore: 'Read more →',
  dateFormatter: formatMonthYear,
  components: { img: ZoomableImage },
  head: ({ title, meta }) => {
    const description = meta.description || SITE.description
    // `tabTitle` in frontmatter sets the browser tab and search title when the
    // page heading (`title`) is too long for it.
    const pageTitle = meta.tabTitle ? `${meta.tabTitle} – ${SITE.name}` : title
    const image = `${SITE.url}/api/og?title=${encodeURIComponent(meta.tabTitle || meta.title || SITE.role)}`
    return (
      <>
        {meta.tabTitle && <title>{pageTitle}</title>}
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={meta.type === 'post' ? 'article' : 'website'} />
        <meta property="og:image" content={image} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
      </>
    )
  },
  footer: (
    <footer className="site-footer">
      <small>
        <time>{YEAR}</time> © {SITE.name} · {SITE.role}
      </small>
      <nav aria-label="Social links">
        <a href={LINKS.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={LINKS.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={LINKS.email}>Email</a>
      </nav>
    </footer>
  )
}
