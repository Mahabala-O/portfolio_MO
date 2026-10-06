// Prints /resume to public/resume.pdf as a one-page PDF with your name as the heading.
// Usage: npm run build && npm start (in another terminal), then: node scripts/resume-pdf.js
// Needs Playwright: npm i -D playwright && npx playwright install chromium
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ colorScheme: 'light' });
  await p.goto('http://localhost:3217/resume', { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    const article = document.querySelector('article');
    article.querySelector('h1').textContent = 'Mikhail Orlov';
    // drop the "Download PDF ·" lead-in from the contact line
    const dl = [...article.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/resume.pdf');
    if (dl) { const next = dl.nextSibling; if (next && next.nodeType === 3) next.textContent = next.textContent.replace(/^\s*·\s*/, ''); dl.remove(); }
    const s = document.createElement('style');
    s.textContent = `article { padding: 0 !important; max-width: none !important; font-size: 10pt !important; line-height: 1.38 !important; }
      article h1 { font-size: 20pt !important; margin: 0 0 2pt !important; }
      article h2 { font-size: 12.5pt !important; margin: 12pt 0 4pt !important; padding-bottom: 2pt; border-bottom: 1px solid #ddd; }
      article h3 { font-size: 10.5pt !important; margin: 8pt 0 1pt !important; }
      article p { margin: 2pt 0 !important; }
      article ul { margin: 2pt 0 !important; } article li { margin: 1pt 0 !important; }
      article time, article .nx-mt-8 { display: none !important; }`;
    document.head.appendChild(s);
  });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: process.argv[2] || 'public/resume.pdf', format: 'Letter', printBackground: false, margin: { top: '0.45in', bottom: '0.45in', left: '0.6in', right: '0.6in' } });
  await b.close();
})();
