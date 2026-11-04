import Head from 'next/head'
import { useRouter } from 'next/router'

import profile from '../lib/profile.json'

// schema.org data (JSON-LD) that search engines and AI search tools read to
// connect this site to Mikhail Orlov: a Person on every page, the home page
// as his profile, and each project page as an article he wrote. Facts come
// from lib/profile.json.
const PERSON_ID = `${profile.url}/#person`

const person = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: profile.name,
  jobTitle: profile.label,
  description: profile.summary,
  url: profile.url,
  email: `mailto:${profile.email}`,
  image: `${profile.url}/apple-touch-icon.png`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: profile.location.city,
    addressRegion: profile.location.region,
    addressCountry: profile.location.countryCode
  },
  sameAs: profile.profiles.map((p) => p.url),
  alumniOf: profile.education.map((e) => ({
    '@type': 'CollegeOrUniversity',
    name: e.institution,
    url: e.url
  })),
  knowsAbout: profile.skills.flatMap((s) => s.keywords)
}

function graphFor(pathname) {
  const nodes = [person]
  if (pathname === '/') {
    nodes.push({
      '@type': 'ProfilePage',
      url: profile.url,
      name: `${profile.name} – ${profile.label}`,
      mainEntity: { '@id': PERSON_ID }
    })
  }
  const project = profile.projects.find(
    (p) => p.url === `${profile.url}${pathname}`
  )
  if (project) {
    nodes.push({
      '@type': 'Article',
      headline: project.name,
      description: project.description,
      url: project.url,
      datePublished: project.startDate,
      keywords: project.keywords.join(', '),
      author: { '@id': PERSON_ID }
    })
  }
  return { '@context': 'https://schema.org', '@graph': nodes }
}

export default function StructuredData() {
  const { pathname } = useRouter()
  return (
    <Head>
      <script
        key="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graphFor(pathname)).replace(/</g, '\\u003c')
        }}
      />
    </Head>
  )
}
