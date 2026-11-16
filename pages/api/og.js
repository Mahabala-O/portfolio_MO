import { ImageResponse } from 'next/og'

import { SITE } from '../../lib/site'

export const config = { runtime: 'edge' }

// Link-preview image (LinkedIn, Slack, iMessage). Each page passes its own
// title, e.g. /api/og?title=Resume
export default function handler(req) {
  const title = new URL(req.url).searchParams.get('title') || SITE.role

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#111111',
          color: '#f5f5f5',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 16,
              background: '#6cb6ff',
              color: '#111111',
              fontSize: 32,
              fontWeight: 700
            }}
          >
            MO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{SITE.name}</div>
            <div style={{ fontSize: 26, color: '#9aa5b4' }}>{SITE.role}</div>
          </div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ fontSize: 26, color: '#9aa5b4' }}>
          MS in Business Analytics · UC Irvine · SQL · Python · Power BI · Tableau
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
