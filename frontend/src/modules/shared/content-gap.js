// Content Gap Analyzer — identifies what's missing vs what AI Overviews typically require

const AIO_REQUIRED_ELEMENTS = [
  { id: 'definition', label: 'Clear topic definition', pattern: /\b(is|are|means|defined as|refers to)\b.{10,}/i, weight: 15, tip: 'Add a clear "X is Y" definition in the first 200 words.' },
  { id: 'howItWorks', label: 'How it works explanation', pattern: /\b(how it works|how .{3,20} works|the process|works by|functions by)\b/i, weight: 10, tip: 'Explain the mechanism — how does this actually work?' },
  { id: 'benefits', label: 'Benefits / advantages', pattern: /\b(benefit|advantage|pro|why use|reason to|helps you|allows you)\b/i, weight: 8, tip: 'List clear benefits — AI Overviews love extracting benefit lists.' },
  { id: 'examples', label: 'Concrete examples', pattern: /\b(for example|for instance|such as|e\.g\.|like |consider |imagine )\b/i, weight: 10, tip: 'Add specific, real-world examples to make content more citable.' },
  { id: 'statistics', label: 'Data & statistics', pattern: /\b\d+(\.\d+)?%|\b\d+\s?(million|billion|thousand)\b/i, weight: 12, tip: 'Include hard data points — statistics are the #1 cited element in AIO.' },
  { id: 'faq', label: 'FAQ section', pattern: /\b(frequently asked|FAQ|common questions|people also ask|Q:|Question:)\b/i, weight: 10, tip: 'Add an FAQ section targeting People Also Ask queries.' },
  { id: 'comparison', label: 'Comparison / alternatives', pattern: /\b(vs|versus|compared to|alternative|difference between|better than)\b/i, weight: 8, tip: 'Include comparisons — "X vs Y" content frequently appears in AIO.' },
  { id: 'stepByStep', label: 'Step-by-step instructions', pattern: /\b(step \d|first,|second,|third,|^\d+\.\s)/im, weight: 10, tip: 'Add numbered step-by-step instructions for process topics.' },
  { id: 'authorInfo', label: 'Author / expert attribution', pattern: /\b(written by|author|expert|according to [A-Z]|says [A-Z])\b/i, weight: 8, tip: 'Add expert attribution — "according to [Expert]" signals boost EEAT.' },
  { id: 'sources', label: 'External source citations', pattern: /\b(according to|source:|published by|study by|research by|via [A-Z])\b/i, weight: 9, tip: 'Cite external authoritative sources explicitly.' }
]

export function analyzeContentGaps(text) {
  const found = []
  const missing = []

  AIO_REQUIRED_ELEMENTS.forEach(el => {
    if (el.pattern.test(text)) {
      found.push(el)
    } else {
      missing.push(el)
    }
  })

  const coverage = Math.round(found.reduce((a, e) => a + e.weight, 0))
  const maxCoverage = AIO_REQUIRED_ELEMENTS.reduce((a, e) => a + e.weight, 0)
  const coveragePercent = Math.round((coverage / maxCoverage) * 100)

  const priority = missing.sort((a, b) => b.weight - a.weight)

  return {
    found,
    missing,
    priority,
    coverage,
    maxCoverage,
    coveragePercent,
    readyForAIO: coveragePercent >= 70
  }
}
