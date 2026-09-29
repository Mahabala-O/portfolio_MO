import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-blog',
  themeConfig: './theme.config.js'
})

export default withNextra({
  async redirects() {
    return [
      { source: '/posts', destination: '/projects', permanent: true },
      { source: '/posts/:slug*', destination: '/projects', permanent: true }
    ]
  }
})
