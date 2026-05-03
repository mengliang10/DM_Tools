// AIO Eligibility Checker — determines likelihood of appearing in Google AI Overviews

export function checkAIOEligibility(text) {
  const checks = []
  let totalScore = 0

  function check(label, condition, points, tip) {
    const passed = condition()
    checks.push({ label, passed, points, tip })
    if (passed) totalScore += points
    return passed
  }

  const words = text.trim().split(/\s+/).filter(Boolean)
  const wc = words.length

  // Content depth
  check('Content depth (600+ words)', () => wc >= 600, 15, 'Aim for 600-2000 words. AI Overviews prefer comprehensive content.')
  check('Content focus (not too long)', () => wc <= 3000, 5, 'Keep content under 3000 words to maintain topic focus.')

  // Structure
  const h2 = (text.match(/^## .+/gm) || []).length
  const h3 = (text.match(/^### .+/gm) || []).length
  check('Clear H2 structure', () => h2 >= 2, 10, 'Use at least 2 H2 headings to organize your content clearly.')
  check('Subheadings (H3)', () => h3 >= 1, 5, 'Add H3 subheadings to break down complex topics.')

  // Query alignment
  const questions = (text.match(/\?/g) || []).length
  check('Question-answer format', () => questions >= 2, 10, 'Include direct Q&A patterns — AI Overviews favor content that asks and answers questions.')

  // EEAT basics
  const hasDate = /\b(20\d{2}|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(text)
  check('Publication date signal', () => hasDate, 8, 'Include publication or update dates — recency is a strong AIO signal.')

  const hasAuthor = /\b(written by|author:|by [A-Z][a-z]+ [A-Z][a-z]+)\b/i.test(text)
  check('Author attribution', () => hasAuthor, 8, 'Add author byline and credentials to boost expertise signals.')

  // Data and citations
  const hasSources = /\b(according to|source:|via|study|research|published|report)\b/i.test(text)
  check('Source citations', () => hasSources, 10, 'Cite authoritative sources — Google trusts content that cites credible references.')

  const hasStats = (text.match(/\b\d+(\.\d+)?%/g) || []).length >= 2
  check('Statistical data', () => hasStats, 8, 'Include 2+ specific statistics with percentages to signal factual depth.')

  // Snippet readiness
  const hasLists = (text.match(/^[-*•\d+\.]\s/gm) || []).length >= 3
  check('Structured lists', () => hasLists, 8, 'Include bulleted or numbered lists — these are heavily featured in AIO.')

  const hasDefinition = /\b.{5,40}\s(is|are|means|refers to|is defined as)\s.{10,100}/.test(text)
  check('Definition present', () => hasDefinition, 8, 'Define your core topic clearly — AI Overviews frequently pull definitional content.')

  // Freshness
  const currentYear = new Date().getFullYear()
  const hasCurrentYear = new RegExp(`\\b${currentYear}\\b`).test(text)
  check(`Mentions ${currentYear} (freshness)`, () => hasCurrentYear, 5, `Include ${currentYear} references to signal content freshness.`)

  const eligibilityLevel = totalScore >= 70 ? 'High' : totalScore >= 50 ? 'Medium' : totalScore >= 30 ? 'Low' : 'Very Low'
  const color = { High: 'green', Medium: 'yellow', Low: 'orange', 'Very Low': 'red' }[eligibilityLevel]

  return { checks, totalScore, maxScore: 100, eligibilityLevel, color }
}
