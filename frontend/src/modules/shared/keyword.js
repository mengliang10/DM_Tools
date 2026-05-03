// Keyword Analyzer — density, prominence, TF-IDF approximation, LSI

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','this','that','these','those','it','its','he','she','they','we','you','i','my','your','his','her','our','their','its','what','which','who','when','where','why','how','all','each','both','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','just','because','as','until','while','about','against','between','into','through','during','before','after','above','below','up','down','out','off','over','under','then','once'])

export function analyzeKeywords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const totalWords = text.split(/\s+/).filter(Boolean).length

  // Single word frequency
  const freq = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  // Bigrams
  const bigrams = {}
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i+1]}`
    bigrams[bg] = (bigrams[bg] || 0) + 1
  }

  // Trigrams
  const trigrams = {}
  for (let i = 0; i < words.length - 2; i++) {
    const tg = `${words[i]} ${words[i+1]} ${words[i+2]}`
    trigrams[tg] = (trigrams[tg] || 0) + 1
  }

  const topSingle = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 15).map(([term, count]) => ({
    term, count, density: ((count / totalWords) * 100).toFixed(2),
    status: count/totalWords >= 0.005 && count/totalWords <= 0.025 ? 'optimal' : count/totalWords < 0.005 ? 'low' : 'high'
  }))

  const topBigrams = Object.entries(bigrams).filter(([,c]) => c >= 2).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([term, count]) => ({
    term, count, density: ((count / totalWords) * 100).toFixed(2)
  }))

  const topTrigrams = Object.entries(trigrams).filter(([,c]) => c >= 2).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([term, count]) => ({
    term, count, density: ((count / totalWords) * 100).toFixed(2)
  }))

  return { topSingle, topBigrams, topTrigrams, totalWords, uniqueWords: Object.keys(freq).length }
}

export function analyzeKeywordPlacement(text, keyword) {
  if (!keyword) return null
  const kw = keyword.toLowerCase()
  const words = text.toLowerCase().split(/\s+/)
  const positions = []
  words.forEach((w, i) => { if (w.includes(kw.split(' ')[0])) positions.push(i) })

  const inFirst100 = text.toLowerCase().split(/\s+/).slice(0, 100).join(' ').includes(kw)
  const inLast100 = text.toLowerCase().split(/\s+/).slice(-100).join(' ').includes(kw)
  const totalOccurrences = (text.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  const density = ((totalOccurrences / words.length) * 100).toFixed(2)

  return {
    keyword,
    totalOccurrences,
    density,
    inFirst100,
    inLast100,
    prominenceScore: Math.min(100, (inFirst100 ? 30 : 0) + (inLast100 ? 10 : 0) + Math.min(60, totalOccurrences * 5)),
    recommendation: density < 0.5 ? 'Under-optimized — use keyword more naturally.' : density > 2.5 ? 'Over-optimized — risk of keyword stuffing.' : 'Density is optimal (0.5–2.5%).'
  }
}
