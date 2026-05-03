// Featured Snippet Optimizer — structures content for featured snippets (which feed AI Overviews)

export const SNIPPET_TYPES = ['Paragraph', 'Numbered List', 'Bulleted List', 'Table', 'Definition']

export function analyzeSnippetReadiness(text) {
  const results = {}

  // Paragraph snippet (40-60 words answering a specific question)
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 50)
  const idealParas = paragraphs.filter(p => {
    const wc = p.trim().split(/\s+/).length
    return wc >= 40 && wc <= 60
  })
  results.paragraph = {
    score: Math.min(100, idealParas.length * 25),
    found: idealParas.length,
    tip: 'Write concise 40-60 word paragraphs that directly answer questions.'
  }

  // Numbered list (steps, rankings, how-tos)
  const numberedLists = (text.match(/^\d+\.\s.+/gm) || []).length
  results.numberedList = {
    score: Math.min(100, numberedLists * 15),
    found: numberedLists,
    tip: 'Use numbered lists for step-by-step processes and rankings.'
  }

  // Bulleted list
  const bulletLists = (text.match(/^[-*•]\s.+/gm) || []).length
  results.bulletedList = {
    score: Math.min(100, bulletLists * 12),
    found: bulletLists,
    tip: 'Use bulleted lists for features, benefits, and comparisons.'
  }

  // Table signals (markdown or HTML tables)
  const tableRows = (text.match(/\|.+\|/g) || []).length
  results.table = {
    score: Math.min(100, tableRows * 20),
    found: tableRows,
    tip: 'Add comparison tables — Google frequently shows these in AI Overviews.'
  }

  // Definition boxes
  const definitions = (text.match(/\b.{10,60}\s(is|are|means|refers to|is defined as)\s.{20,150}/g) || []).length
  results.definition = {
    score: Math.min(100, definitions * 30),
    found: definitions,
    tip: 'Write clear "X is Y" definitions — highly cited in AI Overviews.'
  }

  const overallScore = Math.round(Object.values(results).reduce((a, b) => a + b.score, 0) / Object.keys(results).length)

  return { results, overallScore }
}

export function generateSnippetTemplate(type, topic) {
  const templates = {
    'Paragraph': `${topic} is [one-sentence definition]. [Expand with 2-3 key facts]. [Close with the most important takeaway in one sentence]. (Target: 45-55 words total)`,
    'Numbered List': `How to [${topic}]:\n1. [First step — action verb + specific instruction]\n2. [Second step]\n3. [Third step]\n4. [Fourth step]\n5. [Final step with outcome]`,
    'Bulleted List': `Key aspects of ${topic}:\n• [Specific point with brief explanation]\n• [Specific point]\n• [Specific point]\n• [Specific point]\n• [Specific point]`,
    'Table': `| Feature | ${topic} | Alternative |\n|---------|----------|-------------|\n| [Aspect] | [Value] | [Value] |\n| [Aspect] | [Value] | [Value] |\n| [Aspect] | [Value] | [Value] |`,
    'Definition': `${topic} is [clear, concise definition in 15-25 words]. [One sentence explaining why it matters]. [One sentence on how it works or is used].`
  }
  return templates[type] || ''
}
