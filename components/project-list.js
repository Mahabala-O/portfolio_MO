import Link from 'next/link'
import { useBlogContext } from 'nextra-theme-blog'

import { formatMonthYear } from '../lib/site'

// Every Markdown file in pages/projects/ (except index) is listed here,
// newest first. Each entry comes from the file's frontmatter: title, date,
// highlight (or description), and tools. Set `draft: true` to hide one.
function collectProjects(pageMap, result = []) {
  for (const item of pageMap) {
    if (item.children) collectProjects(item.children, result)
    else if (
      item.route?.startsWith('/projects/') &&
      item.frontMatter &&
      !item.frontMatter.draft
    ) {
      result.push(item)
    }
  }
  return result
}

export default function ProjectList() {
  const { opts } = useBlogContext()
  const projects = collectProjects(opts.pageMap).sort(
    (a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date)
  )

  return (
    <ul className="project-list">
      {projects.map(({ route, frontMatter: fm }) => (
        <li key={route}>
          <Link href={route}>{fm.title}</Link>
          <span className="project-list-summary">
            {fm.highlight || fm.description}
          </span>
          <span className="project-list-meta">
            {[fm.tools, formatMonthYear(fm.date)].filter(Boolean).join(' · ')}
          </span>
        </li>
      ))}
    </ul>
  )
}
