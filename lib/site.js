// Site-wide settings. Change the name, role label, footer links, or description
// here and the header, footer, and link previews pick it up.
export const SITE = {
  name: 'Mikhail Orlov',
  role: 'Business Analyst',
  url: 'https://portfolio-mo.vercel.app',
  description:
    'Mikhail Orlov, business analyst: MS in Business Analytics candidate at UC Irvine with three years of SQL and Power BI reporting in healthcare and e-commerce.'
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
