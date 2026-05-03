// Schema Validator — validates JSON-LD structured data

const REQUIRED_FIELDS = {
  Article: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  Product: ['name', 'offers'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  LocalBusiness: ['name', 'address'],
  Organization: ['name', 'url'],
  Person: ['name'],
  Event: ['name', 'startDate', 'location'],
  Recipe: ['name', 'recipeIngredient', 'recipeInstructions'],
  Review: ['itemReviewed', 'reviewRating', 'author'],
  BreadcrumbList: ['itemListElement'],
  VideoObject: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
  WebSite: ['name', 'url'],
}

const RECOMMENDED_FIELDS = {
  Article: ['description', 'image', 'publisher', 'dateModified', 'wordCount'],
  Product: ['description', 'image', 'brand', 'sku', 'aggregateRating'],
  LocalBusiness: ['telephone', 'openingHours', 'geo', 'image'],
  Event: ['description', 'image', 'offers', 'organizer'],
}

export function validateSchema(jsonString) {
  let parsed
  const errors = []
  const warnings = []
  const info = []

  // Parse
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`], warnings: [], info: [], parsed: null }
  }

  const schemas = Array.isArray(parsed) ? parsed : [parsed]
  const results = schemas.map(schema => validateSingle(schema))

  const allErrors = results.flatMap(r => r.errors)
  const allWarnings = results.flatMap(r => r.warnings)
  const allInfo = results.flatMap(r => r.info)

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    info: allInfo,
    parsed,
    types: results.map(r => r.type),
    score: Math.max(0, 100 - allErrors.length * 20 - allWarnings.length * 5)
  }
}

function validateSingle(schema) {
  const errors = []
  const warnings = []
  const info = []

  if (!schema['@context']) errors.push('Missing @context — must include "https://schema.org"')
  else if (!schema['@context'].includes('schema.org')) errors.push('@context should be "https://schema.org"')

  if (!schema['@type']) { errors.push('Missing @type'); return { type: 'Unknown', errors, warnings, info } }

  const type = schema['@type']

  const required = REQUIRED_FIELDS[type] || []
  required.forEach(field => {
    if (!schema[field]) errors.push(`Missing required field: "${field}" for ${type}`)
  })

  const recommended = RECOMMENDED_FIELDS[type] || []
  recommended.forEach(field => {
    if (!schema[field]) warnings.push(`Recommended field missing: "${field}" for ${type}`)
  })

  // Type-specific checks
  if (type === 'FAQPage' && schema.mainEntity) {
    if (!Array.isArray(schema.mainEntity)) errors.push('mainEntity must be an array of Question objects')
    else {
      schema.mainEntity.forEach((q, i) => {
        if (q['@type'] !== 'Question') errors.push(`mainEntity[${i}] must be @type: "Question"`)
        if (!q.name) errors.push(`mainEntity[${i}] missing "name" (the question text)`)
        if (!q.acceptedAnswer?.text) errors.push(`mainEntity[${i}] missing acceptedAnswer.text`)
      })
    }
  }

  if (type === 'Product' && schema.offers) {
    if (!schema.offers.price && !schema.offers.priceCurrency) warnings.push('Product offers should include price and priceCurrency')
  }

  if (schema.datePublished && !/^\d{4}-\d{2}-\d{2}/.test(schema.datePublished)) {
    warnings.push('datePublished should be ISO 8601 format (YYYY-MM-DD)')
  }

  if (!REQUIRED_FIELDS[type]) info.push(`Schema type "${type}" — no validation rules defined for this type yet`)

  info.push(`@type: ${type} — ${required.length} required fields, ${recommended.length} recommended fields`)

  return { type, errors, warnings, info }
}
