// Builds the "For agents" files on every `npm run build`:
// - public/resume.json: lib/profile.json in the JSON Resume format (jsonresume.org)
// - public/llms-full.txt: public/llms.txt plus the full text of the resume and
//   every project page, with MDX imports and components stripped out
const { promises: fs } = require('fs')
const path = require('path')
const matter = require('gray-matter')

const ROOT = path.join(__dirname, '..')
const profile = require('../lib/profile.json')

function resumeJson() {
  const {
    _comment,
    name,
    label,
    email,
    url,
    summary,
    location,
    profiles,
    ...rest
  } = profile
  return {
    $schema:
      'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: { name, label, email, url, summary, location, profiles },
    ...rest,
    meta: {
      canonical: `${url}/resume.json`,
      lastModified: new Date().toISOString().slice(0, 10)
    }
  }
}

// MDX to plain Markdown: drop imports, {/* comments */} and components, and say
// where an interactive chart was so the reader knows to look at the page.
function mdxToMarkdown(source) {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^import[\s\S]*?from\s+['"].+['"]\s*$/gm, '')
    .replace(
      /^<[A-Z]\w*[^>]*\/>[ \t]*$/gm,
      '*[Interactive chart or figure on the web page]*'
    )
    .replace(/\]\(\//g, `](${profile.url}/`)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function page(file, url) {
  const { data, content } = matter(
    await fs.readFile(path.join(ROOT, file), 'utf8')
  )
  const isProject = file.startsWith('pages/projects/')
  const meta = [
    isProject && `Date: ${new Date(data.date).toISOString().slice(0, 7)}`,
    `URL: ${url}`
  ]
  return `# ${data.title}\n\n${meta.filter(Boolean).join(' · ')}\n\n${mdxToMarkdown(content)}`
}

async function generate() {
  await fs.writeFile(
    path.join(ROOT, 'public/resume.json'),
    JSON.stringify(resumeJson(), null, 2) + '\n'
  )

  const projectDir = path.join(ROOT, 'pages/projects')
  const projects = (await fs.readdir(projectDir)).filter(
    (f) => /\.mdx?$/.test(f) && !f.startsWith('index.')
  )
  const sections = [
    (await fs.readFile(path.join(ROOT, 'public/llms.txt'), 'utf8')).trim(),
    await page('pages/resume.mdx', `${profile.url}/resume`),
    ...(await Promise.all(
      projects.map((f) =>
        page(
          `pages/projects/${f}`,
          `${profile.url}/projects/${f.replace(/\.mdx?$/, '')}`
        )
      )
    ))
  ]
  await fs.writeFile(
    path.join(ROOT, 'public/llms-full.txt'),
    sections.join('\n\n---\n\n') + '\n'
  )
}

generate()
