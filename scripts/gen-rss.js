const { promises: fs } = require('fs')
const path = require('path')
const RSS = require('rss')
const matter = require('gray-matter')

const SITE_URL = 'https://portfolio-mo.vercel.app'
const PAGES_DIR = path.join(__dirname, '..', 'pages')
const POSTS_DIR = path.join(PAGES_DIR, 'projects')

async function generate() {
  const feed = new RSS({
    title: 'Mikhail Orlov',
    description: 'Data analysis projects by Mikhail Orlov',
    site_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.xml`
  })

  const posts = await fs.readdir(POSTS_DIR)
  const allPosts = []
  await Promise.all(
    posts.map(async (name) => {
      if (name.startsWith('index.') || !/\.mdx?$/.test(name)) return

      const content = await fs.readFile(path.join(POSTS_DIR, name))
      const frontmatter = matter(content)
      if (frontmatter.data.draft) return

      allPosts.push({
        title: frontmatter.data.title,
        url: `${SITE_URL}/projects/${name.replace(/\.mdx?$/, '')}`,
        date: frontmatter.data.date,
        description: frontmatter.data.description,
        categories: (frontmatter.data.tools || '').split(', ').filter(Boolean),
        author: frontmatter.data.author || 'Mikhail Orlov'
      })
    })
  )

  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date))
  allPosts.forEach((post) => {
    feed.item(post)
  })
  await fs.writeFile('./public/feed.xml', feed.xml({ indent: true }))

  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/projects`,
    `${SITE_URL}/resume`,
    `${SITE_URL}/fair-guide`,
    ...allPosts.map((post) => post.url)
  ]
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  await fs.writeFile('./public/sitemap.xml', sitemap)
}

generate()
