// Readability Analyzer — Flesch-Kincaid + AIO-specific readability signals

export function analyzeReadability(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const words = text.trim().split(/\s+/).filter(Boolean)
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0)

  const avgWordsPerSentence = words.length / (sentences.length || 1)
  const avgSyllablesPerWord = syllables / (words.length || 1)

  // Flesch Reading Ease
  const fleschScore = Math.round(206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord)
  const clampedFlesch = Math.min(100, Math.max(0, fleschScore))

  // Flesch-Kincaid Grade Level
  const gradeLevel = Math.max(0, Math.round(0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59))

  const readingLevel = clampedFlesch >= 70 ? 'Easy' : clampedFlesch >= 50 ? 'Standard' : clampedFlesch >= 30 ? 'Difficult' : 'Very Difficult'
  const aioIdeal = clampedFlesch >= 50 && clampedFlesch <= 75

  // AIO-specific checks
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length
  const shortSentences = sentences.filter(s => s.split(/\s+/).length <= 12).length
  const passiveVoice = (text.match(/\b(was|were|is|are|been|being)\s+\w+ed\b/gi) || []).length
  const transitionWords = (text.match(/\b(however|therefore|furthermore|additionally|moreover|consequently|in contrast|as a result|for example|for instance|in addition|on the other hand)\b/gi) || []).length

  const suggestions = []
  if (clampedFlesch < 50) suggestions.push('Simplify language — aim for Flesch score 50-70 for optimal AI readability.')
  if (avgWordsPerSentence > 25) suggestions.push(`Average sentence is ${Math.round(avgWordsPerSentence)} words — break long sentences into shorter ones.`)
  if (gradeLevel > 12) suggestions.push(`Grade level ${gradeLevel} is too high — write for grade 8-10 for broader AI citation eligibility.`)
  if (longSentences > sentences.length * 0.3) suggestions.push('Too many long sentences — keep most sentences under 20 words.')
  if (passiveVoice > 5) suggestions.push('Reduce passive voice — active voice is clearer for AI extraction.')
  if (transitionWords < 3) suggestions.push('Add transition words (however, therefore, additionally) to improve logical flow signals.')

  return {
    fleschScore: clampedFlesch,
    gradeLevel,
    readingLevel,
    aioIdeal,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    totalWords: words.length,
    totalSentences: sentences.length,
    longSentences,
    shortSentences,
    passiveVoice,
    transitionWords,
    suggestions
  }
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}
