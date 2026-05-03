// SERP Preview — generates realistic Google search result previews

export function generateSerpPreview(data) {
  const { title = '', metaDesc = '', url = '', keyword = '' } = data

  // Truncate with ellipsis
  const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + '…' : str

  const displayTitle = truncate(title || 'Page Title', 60)
  const displayDesc = truncate(metaDesc || 'No meta description found. Google will auto-generate a snippet from your page content.', 160)
  const displayUrl = url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'yourwebsite.com/page-url'

  // Breadcrumb URL
  const urlParts = displayUrl.split('/').filter(Boolean)
  const breadcrumb = urlParts.join(' › ')

  // Highlight keyword in title and desc
  function highlight(text, kw) {
    if (!kw) return text
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<strong>$1</strong>')
  }

  const scores = {
    titleLength: { value: title.length, ideal: [50, 60], label: 'Title Length' },
    descLength: { value: metaDesc.length, ideal: [120, 160], label: 'Meta Desc Length' },
    urlLength: { value: url.length, ideal: [0, 75], label: 'URL Length' },
  }

  return {
    displayTitle,
    displayDesc,
    displayUrl,
    breadcrumb,
    highlightedTitle: highlight(displayTitle, keyword),
    highlightedDesc: highlight(displayDesc, keyword),
    scores,
    isTitleOptimal: title.length >= 50 && title.length <= 60,
    isDescOptimal: metaDesc.length >= 120 && metaDesc.length <= 160,
    ctaScore: estimateCTR(title, metaDesc, keyword)
  }
}

function estimateCTR(title, desc, keyword) {
  let score = 50 // baseline
  const t = title.toLowerCase()
  const d = desc.toLowerCase()

  // Power words
  const powerWords = ['best', 'top', 'ultimate', 'complete', 'guide', 'how to', 'free', 'new', 'easy', 'proven', 'expert', 'fast', 'simple', '2024', '2025']
  powerWords.forEach(w => { if (t.includes(w)) score += 5 })

  // Numbers in title
  if (/\d/.test(title)) score += 8

  // Question in title
  if (title.includes('?')) score += 5

  // Keyword present
  if (keyword && t.includes(keyword.toLowerCase())) score += 10

  // Meta desc has CTA
  if (/\b(learn|discover|get|find|try|see|explore|download|read)\b/i.test(desc)) score += 5

  return Math.min(100, Math.max(10, score))
}
