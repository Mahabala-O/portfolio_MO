# Mikhail Orlov — Portfolio

Personal portfolio at [portfolio-mo.vercel.app](https://portfolio-mo.vercel.app), built with Next.js and [Nextra](https://nextra.site) (`nextra-theme-blog`).

## Editing content

- **About page:** `pages/index.mdx`
- **Projects:** add a Markdown file to `pages/projects/`. Frontmatter:

  ```yaml
  ---
  title: Project name
  date: 2026/5/6 # controls sort order
  description: One or two sentences shown on the projects list
  tag: python, tableau # comma-separated, becomes /tags/<tag> pages
  ---
  ```

- **Footer links, site name, SEO defaults:** `theme.config.js`
- **Colors (light and dark):** CSS variables at the top of `styles/main.css`

The build (`npm run build`) also generates `public/feed.xml` (RSS) and `public/sitemap.xml` from the projects folder.

## Development

```bash
npm install
npm run dev
```

Dark mode follows the visitor's system setting by default, and the toggle in the nav overrides it.
