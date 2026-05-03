// On-Page SEO Analyzer

export function analyzeOnPage(data) {
  const { title = '', metaDesc = '', url = '', h1 = '', content = '', keyword = '' } = data
  const checks = []
  const kw = keyword.toLowerCase().trim()

  function check(label, status, value, tip, weight = 5) {
    checks.push({ label, status, value, tip, weight })
    return status
  }

  // Title
  const titleLen = title.length
  check('Title tag present', titleLen > 0, `${titleLen} chars`, 'Every page needs a unique title tag.', 10)
  check('Title length (50–60 chars)', titleLen >= 50 && titleLen <= 60, `${titleLen}/60`, titleLen < 50 ? 'Title too short — aim for 50–60 characters.' : 'Title too long — Google truncates at ~60 chars.', 8)
  if (kw) check('Keyword in title', title.toLowerCase().includes(kw), kw, 'Include your primary keyword in the title tag.', 10)
  if (kw) check('Keyword at start of title', title.toLowerCase().startsWith(kw), kw, 'Front-loading the keyword in the title improves prominence.', 5)

  // Meta description
  const metaLen = metaDesc.length
  check('Meta description present', metaLen > 0, `${metaLen} chars`, 'Write a compelling meta description for CTR.', 8)
  check('Meta description length (120–160)', metaLen >= 120 && metaLen <= 160, `${metaLen}/160`, metaLen < 120 ? 'Too short — aim for 120–160 characters.' : 'Too long — Google truncates above 160 chars.', 6)
  if (kw) check('Keyword in meta description', metaDesc.toLowerCase().includes(kw), kw, 'Include your keyword in the meta description.', 5)

  // URL
  if (url) {
    const urlClean = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
    check('URL is lowercase', url === url.toLowerCase(), url, 'URLs should be lowercase to avoid duplicate content.', 4)
    check('URL uses hyphens not underscores', !url.includes('_'), url, 'Use hyphens (-) instead of underscores (_) in URLs.', 4)
    check('URL is short (< 75 chars)', url.length < 75, `${url.length} chars`, 'Keep URLs short and descriptive.', 3)
    if (kw) check('Keyword in URL', urlClean.includes(kw.replace(/\s+/g, '-')), kw, 'Include your keyword in the URL slug.', 6)
  }

  // H1
  check('H1 present', h1.length > 0, h1.slice(0, 50), 'Every page must have exactly one H1 tag.', 10)
  if (kw && h1) check('Keyword in H1', h1.toLowerCase().includes(kw), kw, 'Include your primary keyword in the H1.', 8)

  // Content
  const words = content.trim().split(/\s+/).filter(Boolean)
  const wc = words.length
  check('Content length (600+ words)', wc >= 600, `${wc} words`, 'Aim for 600+ words for competitive topics.', 8)
  check('Content length (1000+ words ideal)', wc >= 1000, `${wc} words`, '1000+ words signals content depth to Google.', 5)

  // Keyword density
  if (kw && content) {
    const kwCount = (content.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    const density = wc > 0 ? ((kwCount / wc) * 100).toFixed(2) : 0
    check('Keyword density (0.5–2.5%)', density >= 0.5 && density <= 2.5, `${density}% (${kwCount}x)`, density < 0.5 ? 'Keyword underused — mention it more naturally.' : 'Keyword overused — risks keyword stuffing penalty.', 7)
    check('Keyword in first 100 words', content.toLowerCase().split(/\s+/).slice(0, 100).join(' ').includes(kw), kw, 'Use your keyword in the first paragraph.', 6)
  }

  const passed = checks.filter(c => c.status).length
  const totalWeight = checks.reduce((a, c) => a + c.weight, 0)
  const earnedWeight = checks.filter(c => c.status).reduce((a, c) => a + c.weight, 0)
  const score = Math.round((earnedWeight / totalWeight) * 100)
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'

  return { checks, passed, total: checks.length, score, grade }
}
