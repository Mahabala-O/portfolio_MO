# Mikhail Orlov — Portfolio

Personal portfolio at [portfolio-mo.vercel.app](https://portfolio-mo.vercel.app), built with Next.js and [Nextra](https://nextra.site) (`nextra-theme-blog`). Pushing to `main` redeploys the site on Vercel.

## Updating content

| What | Where |
| --- | --- |
| Name, role label, footer links, site description | `lib/site.js` (used by the header, footer, and link previews) |
| Homepage headline (`title`), browser-tab title (`tabTitle`), intro, links, bio | `pages/index.mdx` |
| Resume | `pages/resume.mdx` (editing notes are at the top of the file) |
| Header navigation | `NAV` in `components/site-header.js` |
| Colors for light and dark mode | CSS variables at the top of `styles/main.css` |

### Adding a project

Add a Markdown file to `pages/projects/`. It shows up automatically in the project list on the homepage and the Projects page, newest first.

```yaml
---
title: Project name
date: 2026/5/6 # sets the order; shown as "May 2026"
description: One or two sentences (used for search results and link previews)
highlight: The headline result, e.g. "Cut forecast error 18%" # optional, shown in the list instead of the description
tools: Python, SQL, Tableau # optional
draft: true # optional, hides the project
---
```

Images in a project write-up open full size when clicked.

The build (`npm run build`) also generates `public/feed.xml` (RSS) and `public/sitemap.xml`. Link-preview images come from `pages/api/og.js`.

## Development

```bash
npm install
npm run dev
```

Dark mode follows the visitor's system setting by default, and the toggle in the header overrides it.
