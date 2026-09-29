// Site-wide settings. Change links, role, or tagline here and every page
// (header, footer, homepage, link previews) picks it up.
export const SITE = {
  name: 'Mikhail Orlov',
  role: 'Business Analytics',
  url: 'https://portfolio-mo.vercel.app',
  description:
    'Mikhail Orlov: MS in Business Analytics candidate at UC Irvine with three years of SQL and Power BI reporting for operations teams.'
}

export const LINKS = {
  resume: '/resume',
  linkedin: 'https://www.linkedin.com/in/mikhail-orlov-uci',
  github: 'https://github.com/Mahabala-O',
  email: 'mailto:mikhail.orlov.ca@gmail.com'
}

export function formatMonthYear(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}
