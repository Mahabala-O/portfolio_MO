import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-blog',
  themeConfig: './theme.config.js'
})

export default withNextra({
  async redirects() {
    return [
      { source: '/posts', destination: '/projects', permanent: true },
      { source: '/posts/:slug*', destination: '/projects', permanent: true },
      { source: '/tags/:tag*', destination: '/projects', permanent: true },
      // Temporary: the Photos page was removed but may come back.
      { source: '/photos', destination: '/', permanent: false }
    ]
  },
  async rewrites() {
    return [
      // Standalone career-fair guide (public/fair-guide.html), served without the site layout.
      { source: '/fair-guide', destination: '/fair-guide.html' }
    ]
  }
})
