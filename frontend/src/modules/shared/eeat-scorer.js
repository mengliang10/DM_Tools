// EEAT Scorer — Experience, Expertise, Authoritativeness, Trustworthiness
// Google's primary quality framework for AI Overview eligibility

export function scoreEEAT(text) {
  const result = { experience: 0, expertise: 0, authoritativeness: 0, trustworthiness: 0, signals: {}, suggestions: [] }

  // EXPERIENCE — first-person, case studies, real examples
  const firstPerson = (text.match(/\b(I|we|our|my|we've|I've|we found|I found|in my experience|in our experience)\b/gi) || []).length
  const caseStudy = (text.match(/\b(case study|case studies|our results|we tested|we tried|we saw|we achieved|our client|our customers)\b/gi) || []).length
  result.experience = Math.min(25, firstPerson * 2 + caseStudy * 5)
  result.signals.experience = { firstPerson, caseStudy }
  if (result.experience < 10) result.suggestions.push('Add first-person experience signals — "we tested", "in our experience", real case study data.')

  // EXPERTISE — technical depth, jargon, credentials
  const credentials = (text.match(/\b(PhD|MBA|certified|licensed|expert|specialist|years of experience|according to|research shows|studies show)\b/gi) || []).length
  const technical = (text.match(/\b([A-Z]{2,6})\b/g) || []).filter(t => t.length >= 2).length // acronyms as proxy
  const definitions = (text.match(/\b(defined as|refers to|means that|is the process of|is a method)\b/gi) || []).length
  result.expertise = Math.min(25, credentials * 3 + technical * 1 + definitions * 2)
  result.signals.expertise = { credentials, technical, definitions }
  if (result.expertise < 10) result.suggestions.push('Demonstrate expertise — cite credentials, use precise technical language, include clear definitions.')

  // AUTHORITATIVENESS — citations, named sources, statistics
  const citations = (text.match(/\b(according to|source:|published|study by|report by|via|cited|references|bibliography)\b/gi) || []).length
  const namedSources = (text.match(/\b(Google|Harvard|MIT|Forbes|Reuters|Bloomberg|McKinsey|Gartner|Forrester|Nielsen|Statista)\b/gi) || []).length
  const stats = (text.match(/\b\d+(\.\d+)?(%|x)\b/g) || []).length
  result.authoritativeness = Math.min(25, citations * 3 + namedSources * 5 + stats * 2)
  result.signals.authoritativeness = { citations, namedSources, stats }
  if (result.authoritativeness < 10) result.suggestions.push('Boost authority — cite named sources (Google, Forbes, Gartner), include statistics with attribution.')

  // TRUSTWORTHINESS — transparency, dates, author info, disclaimers
  const dates = (text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\b/g) || []).length
  const transparency = (text.match(/\b(last updated|published on|written by|reviewed by|fact.checked|disclaimer|disclosure|as of)\b/gi) || []).length
  const contactSignals = (text.match(/\b(contact|email|phone|address|about us|privacy policy)\b/gi) || []).length
  result.trustworthiness = Math.min(25, dates * 1 + transparency * 5 + contactSignals * 3)
  result.signals.trustworthiness = { dates, transparency, contactSignals }
  if (result.trustworthiness < 10) result.suggestions.push('Add trust signals — publication dates, author bylines, "last updated" timestamps, disclosure statements.')

  result.total = result.experience + result.expertise + result.authoritativeness + result.trustworthiness
  result.grade = result.total >= 80 ? 'A' : result.total >= 65 ? 'B' : result.total >= 50 ? 'C' : result.total >= 35 ? 'D' : 'F'
  result.aioEligible = result.total >= 55

  return result
}
