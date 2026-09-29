const YEAR = new Date().getFullYear()
const SITE_NAME = 'Mikhail Orlov'
const SITE_DESCRIPTION =
  'Mikhail Orlov: MSBA candidate at UC Irvine. Data analysis projects in Python, SQL, and Tableau.'

const LINKS = {
  linkedin: 'https://www.linkedin.com/in/mikhail-orlov-das',
  github: 'https://github.com/Mahabala-O',
  email: 'mailto:mikhail.orlov.ca@gmail.com'
}

export default {
  darkMode: true,
  titleSuffix: ` – ${SITE_NAME}`,
  readMore: 'Read more →',
  head: ({ title, meta }) => {
    const description = meta.description || SITE_DESCRIPTION
    return (
      <>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={meta.type === 'post' ? 'article' : 'website'} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </>
    )
  },
  footer: (
    <footer className="site-footer">
      <small>
        <time>{YEAR}</time> © {SITE_NAME}
      </small>
      <nav aria-label="Social links">
        <a href={LINKS.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={LINKS.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={LINKS.email}>Email</a>
        <a href="/feed.xml">RSS</a>
      </nav>
    </footer>
  )
}
