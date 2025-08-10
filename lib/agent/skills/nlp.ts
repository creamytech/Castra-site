export type LeadEntities = {
  priceMin?: number
  priceMax?: number
  beds?: number
  baths?: number
  city?: string
  timeframe?: string
  phone?: string
  name?: string
}

export function extractEntities(text: string): LeadEntities {
  const ents: LeadEntities = {}
  const price = text.match(/\$?(\d{3,})\s*-\s*\$?(\d{3,})/)
  const single = text.match(/\$?(\d{3,})k/i)
  if (price) { ents.priceMin = parseInt(price[1], 10); ents.priceMax = parseInt(price[2], 10) }
  else if (single) { const p = parseInt(single[1], 10) * 1000; ents.priceMin = p; ents.priceMax = p }
  const beds = text.match(/(\d+)\s*bed/i); if (beds) ents.beds = parseInt(beds[1], 10)
  const baths = text.match(/(\d+)\s*bath/i); if (baths) ents.baths = parseInt(baths[1], 10)
  const city = text.match(/in\s+([A-Za-z\s]+)(?:\.|,|$)/i); if (city) ents.city = city[1].trim()
  const timeframe = text.match(/(\d+\s*months?|this\s*week|next\s*week)/i); if (timeframe) ents.timeframe = timeframe[1]
  const phone = text.match(/(\+?1?\s*\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/); if (phone) ents.phone = phone[1]
  const name = text.match(/(?:I\s*am|I'm|This is)\s*([A-Za-z\s]+)/i); if (name) ents.name = name[1].trim()
  return ents
}
