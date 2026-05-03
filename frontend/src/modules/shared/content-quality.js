// Content Quality Scorer — thin content, engagement, uniqueness signals

export function scoreContentQuality(text) {
  const metrics = {}
  const suggestions = []

  const words = text.trim().split(/\s+/).filter(Boolean)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 30)
  const wc = words.length

  // Thin content check
  metrics.wordCount = { value: wc, score: wc >= 1000 ? 20 : wc >= 600 ? 14 : wc >= 300 ? 8 : 3, max: 20 }
  if (wc < 300) suggestions.push('Content is too thin — Google may not index or rank pages under 300 words.')
  else if (wc < 600) suggestions.push('Add more depth — aim for 600-1500 words for competitive keywords.')

  // Unique value signals
  const hasExamples = /\b(for example|for instance|such as|e\.g\.|like |consider )\b/i.test(text)
  const hasData = /\b\d+(\.\d+)?(%|x|million|billion)\b/i.test(text)
  const hasQuotes = /"[^"]{20,}"/.test(text)
  const originalityScore = (hasExamples ? 25 : 0) + (hasData ? 25 : 0) + (hasQuotes ? 20 : 0) + (paragraphs.length >= 4 ? 30 : paragraphs.length * 7)
  metrics.originality = { value: `${hasExamples ? '✓' : '✗'} Examples, ${hasData ? '✓' : '✗'} Data, ${hasQuotes ? '✓' : '✗'} Quotes`, score: Math.min(20, Math.round(originalityScore / 5)), max: 20 }
  if (!hasExamples) suggestions.push('Add concrete examples to demonstrate expertise and improve engagement.')
  if (!hasData) suggestions.push('Include statistics and data points — they increase credibility and shareability.')

  // Multimedia signals
  const hasImages = /!\[.*?\]\(.*?\)/.test(text) || /<img/i.test(text)
  const hasVideo = /\b(video|youtube|watch|embed)\b/i.test(text)
  const hasTables = /\|.+\|/.test(text)
  const mediaScore = (hasImages ? 40 : 0) + (hasVideo ? 30 : 0) + (hasTables ? 30 : 0)
  metrics.multimedia = { value: `${hasImages ? '✓' : '✗'} Images, ${hasVideo ? '✓' : '✗'} Video, ${hasTables ? '✓' : '✗'} Tables`, score: Math.min(15, Math.round(mediaScore / 7)), max: 15 }
  if (!hasImages) suggestions.push('Add images — pages with visuals rank better and reduce bounce rate.')

  // Structure quality
  const hasH2 = /^## .+/m.test(text)
  const hasH3 = /^### .+/m.test(text)
  const hasBullets = /^[-*•]\s/m.test(text)
  const structureScore = (hasH2 ? 40 : 0) + (hasH3 ? 30 : 0) + (hasBullets ? 30 : 0)
  metrics.structure = { value: `${hasH2 ? '✓' : '✗'} H2, ${hasH3 ? '✓' : '✗'} H3, ${hasBullets ? '✓' : '✗'} Lists`, score: Math.min(15, Math.round(structureScore / 7)), max: 15 }
  if (!hasH2) suggestions.push('Add H2 subheadings to structure content and improve crawlability.')

  // Engagement signals
  const avgSentenceLen = wc / (sentences.length || 1)
  const hasQuestions = /\?/.test(text)
  const hasCTA = /\b(learn more|click here|get started|sign up|try|download|contact|subscribe|discover)\b/i.test(text)
  const engagementScore = (avgSentenceLen < 20 ? 30 : 15) + (hasQuestions ? 35 : 0) + (hasCTA ? 35 : 0)
  metrics.engagement = { value: `Avg ${Math.round(avgSentenceLen)} words/sentence`, score: Math.min(15, Math.round(engagementScore / 7)), max: 15 }
  if (!hasCTA) suggestions.push('Add a clear CTA (call to action) — helps reduce bounce rate.')

  // Freshness
  const currentYear = new Date().getFullYear()
  const hasFreshDate = new RegExp(`\\b(${currentYear}|${currentYear - 1})\\b`).test(text)
  metrics.freshness = { value: hasFreshDate ? `Year ${currentYear} or ${currentYear-1} mentioned` : 'No recent date found', score: hasFreshDate ? 15 : 5, max: 15 }
  if (!hasFreshDate) suggestions.push(`Mention ${currentYear} to signal freshness — Google favors recently updated content.`)

  const totalScore = Object.values(metrics).reduce((a, m) => a + m.score, 0)
  const maxScore = Object.values(metrics).reduce((a, m) => a + m.max, 0)
  const score = Math.round((totalScore / maxScore) * 100)
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'

  return { metrics, score, grade, suggestions, totalScore, maxScore }
}
