// Technical SEO Checklist — signals detectable from content/markup

export function checkTechnical(data) {
  const { html = '', url = '', title = '', metaDesc = '' } = data
  const checks = []

  function check(category, label, passed, tip, severity = 'warning') {
    checks.push({ category, label, passed, tip, severity })
  }

  // Title & Meta
  check('Meta', 'Title tag present', title.length > 0, 'Add a <title> tag to your page.', 'critical')
  check('Meta', 'Title not duplicate', true, 'Ensure each page has a unique title tag.', 'warning')
  check('Meta', 'Meta description present', metaDesc.length > 0, 'Add a meta description for better CTR.', 'warning')
  check('Meta', 'Meta charset defined', html.includes('charset') || html.includes('UTF-8'), 'Add <meta charset="UTF-8"> to your HTML.', 'critical')
  check('Meta', 'Viewport meta tag', html.includes('viewport'), 'Add <meta name="viewport"> for mobile.', 'critical')

  // Structured Data
  check('Structured Data', 'JSON-LD present', html.includes('application/ld+json'), 'Add JSON-LD structured data to help search engines understand your content.', 'warning')
  check('Structured Data', 'Open Graph tags', html.includes('og:title') || html.includes('og:description'), 'Add Open Graph meta tags for social sharing.', 'info')
  check('Structured Data', 'Twitter Card tags', html.includes('twitter:card'), 'Add Twitter Card meta tags.', 'info')

  // Images
  const imgCount = (html.match(/<img/gi) || []).length
  const imgWithAlt = (html.match(/<img[^>]+alt=/gi) || []).length
  check('Images', 'All images have alt text', imgCount === 0 || imgWithAlt >= imgCount, `${imgWithAlt}/${imgCount} images have alt text. Add descriptive alt attributes.`, 'warning')
  check('Images', 'Images present', imgCount > 0, 'Add relevant images to improve engagement and ranking signals.', 'info')

  // Links
  const internalLinks = (html.match(/href=["'][^"']*["']/gi) || []).filter(h => !h.includes('http')).length
  const externalLinks = (html.match(/href=["']https?:\/\//gi) || []).length
  check('Links', 'Internal links present', internalLinks > 0, 'Add internal links to distribute PageRank and improve crawlability.', 'warning')
  check('Links', 'External links present', externalLinks > 0, 'Linking to authoritative external sources signals content quality.', 'info')
  check('Links', 'No broken link patterns', !html.includes('href="#"') && !html.includes('href=""'), 'Remove empty or placeholder href attributes.', 'warning')

  // Heading structure
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length
  check('Headings', 'Exactly one H1', h1Count === 1, h1Count === 0 ? 'Add an H1 tag.' : 'Multiple H1s found — use only one per page.', 'critical')
  check('Headings', 'H2 tags present', (html.match(/<h2[\s>]/gi) || []).length > 0, 'Add H2 subheadings to structure your content.', 'warning')

  // Canonical
  check('Crawl', 'Canonical tag present', html.includes('rel="canonical"'), 'Add a canonical URL to prevent duplicate content issues.', 'warning')
  check('Crawl', 'No noindex on important pages', !html.includes('noindex'), 'Remove noindex if this page should be indexed.', 'critical')
  check('Crawl', 'Hreflang for international', html.includes('hreflang') || true, 'Add hreflang tags for multilingual content.', 'info')

  // Performance signals
  check('Performance', 'No render-blocking scripts in <head>', !html.match(/<head[^>]*>[\s\S]*?<script(?![^>]*defer|[^>]*async)/i), 'Use defer/async on scripts to improve page speed.', 'warning')
  check('Performance', 'CSS minification signals', !html.includes('    ') || html.length < 50000, 'Minify HTML/CSS for faster load times.', 'info')

  // HTTPS
  if (url) check('Security', 'HTTPS URL', url.startsWith('https://'), 'Migrate to HTTPS — Google uses it as a ranking signal.', 'critical')

  const passed = checks.filter(c => c.passed).length
  const critical = checks.filter(c => !c.passed && c.severity === 'critical').length
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length

  const categories = [...new Set(checks.map(c => c.category))]

  return { checks, passed, total: checks.length, critical, warnings, categories }
}
