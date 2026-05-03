// Passage Ranker — identifies which passages are most likely to be extracted by Google AI Overviews

export function rankPassages(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 30)

  const scored = sentences.map(sentence => {
    let score = 0
    const signals = []

    // Definition signal
    if (/\b(is|are|means|defined as|refers to|is the)\b/i.test(sentence)) { score += 20; signals.push('definition') }

    // Statistical claim
    if (/\b\d+(\.\d+)?(%|x|million|billion|thousand)\b/i.test(sentence)) { score += 15; signals.push('statistic') }

    // Direct answer pattern (starts with subject + verb)
    if (/^(The|A|An|To|When|How|Why|What)\b/i.test(sentence.trim())) { score += 10; signals.push('direct-answer') }

    // List-like pattern
    if (/\b(first|second|third|1\.|2\.|3\.|include|including|such as|for example|e\.g\.)\b/i.test(sentence)) { score += 12; signals.push('list-like') }

    // Authority signal
    if (/\b(according to|study|research|Google|published|experts)\b/i.test(sentence)) { score += 15; signals.push('authoritative') }

    // Question-answer proximity
    if (/\?/.test(sentence)) { score += 8; signals.push('question') }

    // Conciseness bonus (ideal passage length: 40-120 words)
    const wordCount = sentence.split(/\s+/).length
    if (wordCount >= 20 && wordCount <= 80) { score += 10; signals.push('concise') }
    else if (wordCount > 120) { score -= 5 }

    // Actionable language
    if (/\b(you can|you should|use|create|build|implement|start|try|consider)\b/i.test(sentence)) { score += 8; signals.push('actionable') }

    return { sentence: sentence.trim(), score, signals, wordCount }
  })

  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, 10)

  return {
    ranked,
    topPassages: ranked.slice(0, 3),
    totalSentences: sentences.length,
    avgScore: Math.round(scored.reduce((a, b) => a + b.score, 0) / (scored.length || 1))
  }
}
