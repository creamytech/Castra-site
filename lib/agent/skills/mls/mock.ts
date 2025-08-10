import { MlsProvider, Listing, SearchQuery, Comp } from './types'

function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul((h ^ seed.charCodeAt(i)), 16777619)
  return () => ((h = Math.imul((h ^ (h >>> 13)), 16777619)) >>> 0) / 2 ** 32
}

const CITIES = ["Fort Lauderdale","Miami","Hollywood","Pompano Beach","Boca Raton","Coral Springs","Weston"]
const ZIPS = ["33301","33304","33308","33312","33316","33334","33315","33305"]
const TYPES: Listing["propertyType"][] = ["Single Family","Condo","Townhouse"]
const STOCK_IMAGES = [
  "https://picsum.photos/seed/house1/800/600",
  "https://picsum.photos/seed/house2/800/600",
  "https://picsum.photos/seed/house3/800/600",
  "https://picsum.photos/seed/house4/800/600",
  "https://picsum.photos/seed/house5/800/600",
]

function genListing(id: string, city: string, zipcode: string, r: () => number): Listing {
  const beds = Math.max(1, Math.floor(r() * 5) + 1)
  const baths = Math.max(1, Math.floor(r() * 4) + 1)
  const sqft = Math.floor(700 + r() * 2800)
  const ppsf = 300 + Math.floor(r() * 450)
  const price = sqft * ppsf
  const yearBuilt = 1950 + Math.floor(r() * 70)
  const lotSqft = Math.floor(sqft * (1.5 + r() * 2))
  const lat = 26.12 + r() * 0.3
  const lng = -80.17 + r() * 0.3
  const idx = Math.floor(r() * STOCK_IMAGES.length)
  return {
    id,
    address: `${Math.floor(100 + r() * 9800)} ${["N","S","E","W"][Math.floor(r() * 4)]} ${["Bay","Ocean","Sunset","River","Las Olas","Palm","Coral"][Math.floor(r() * 7)]} ${["Ave","St","Dr","Blvd","Ct"][Math.floor(r() * 5)]}`,
    city,
    state: "FL",
    zipcode,
    lat,
    lng,
    price,
    beds,
    baths,
    sqft,
    lotSqft,
    yearBuilt,
    daysOnMarket: Math.floor(r() * 45),
    propertyType: TYPES[Math.floor(r() * TYPES.length)],
    thumbnailUrl: STOCK_IMAGES[idx],
    imageUrls: [STOCK_IMAGES[idx], STOCK_IMAGES[(idx + 1) % STOCK_IMAGES.length]],
    status: "Active",
    url: `https://example.com/listing/${id}`,
  }
}

function distanceMiles(a: { lat: number, lng: number }, b: { lat: number, lng: number }) {
  const toRad = (d: number) => d * Math.PI / 180
  const R = 3958.8
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const MockMlsProvider: MlsProvider = {
  async searchListings(q: SearchQuery): Promise<Listing[]> {
    const seed = JSON.stringify(q)
    const r = rng(seed)
    const city = q.city || CITIES[Math.floor(r() * CITIES.length)]
    const zipcode = q.zipcode || ZIPS[Math.floor(r() * ZIPS.length)]
    const total = Math.min(q.limit ?? 20, 50)
    const items: Listing[] = []
    for (let i = 0; i < total; i++) items.push(genListing(`${i}-${zipcode}`, city, zipcode, r))
    let filtered = items
    if (q.priceMin) filtered = filtered.filter(x => x.price >= q.priceMin!)
    if (q.priceMax) filtered = filtered.filter(x => x.price <= q.priceMax!)
    if (q.bedsMin) filtered = filtered.filter(x => x.beds >= q.bedsMin!)
    if (q.bathsMin) filtered = filtered.filter(x => x.baths >= q.bathsMin!)
    if (q.propertyType) filtered = filtered.filter(x => x.propertyType === q.propertyType)
    if (q.lat && q.lng && q.radiusMiles) {
      filtered = filtered.filter(x => distanceMiles({ lat: q.lat!, lng: q.lng! }, { lat: x.lat, lng: x.lng }) <= q.radiusMiles!)
    }
    return filtered
  },

  async getComps(subject): Promise<{ subjectEstimate: { suggestedPrice: number; pricePerSqft: number; range: { low: number; high: number }; methodology: string }; comps: Comp[]; }> {
    const seed = JSON.stringify(subject)
    const r = rng(seed)
    const subjSqft = subject.sqft ?? Math.floor(1200 + r() * 1800)
    const subjBeds = subject.beds ?? Math.max(2, Math.floor(r() * 4) + 2)
    const subjBaths = subject.baths ?? Math.max(2, Math.floor(r() * 3) + 2)
    const basePpsf = 350 + Math.floor(r() * 250)
    const subjectLat = subject.lat ?? (26.12 + r() * 0.3)
    const subjectLng = subject.lng ?? (-80.17 + r() * 0.3)
    const city = subject.city ?? CITIES[Math.floor(r() * CITIES.length)]
    const zipcode = ZIPS[Math.floor(r() * ZIPS.length)]

    const comps: Comp[] = Array.from({ length: 6 }).map((_, i) => {
      const l = genListing(`comp-${i}`, city, zipcode, r)
      l.sqft = Math.max(800, Math.floor(subjSqft * (0.85 + r() * 0.3)))
      l.beds = Math.max(1, subjBeds + Math.floor(r() * 3) - 1)
      l.baths = Math.max(1, subjBaths + Math.floor(r() * 3) - 1)
      l.lat = subjectLat + (r() - 0.5) * 0.05
      l.lng = subjectLng + (r() - 0.5) * 0.05
      l.status = 'Closed'
      l.closedDate = new Date(Date.now() - Math.floor(r() * 90) * 864e5).toISOString()
      const pricePerSqft = basePpsf * (0.85 + r() * 0.3)
      l.price = Math.floor(l.sqft * pricePerSqft)
      const dist = distanceMiles({ lat: subjectLat, lng: subjectLng }, { lat: l.lat, lng: l.lng })
      const sqftAdj = (subjSqft - l.sqft) * pricePerSqft * 0.25
      const bedsAdj = (subjBeds - l.beds) * 15000
      const bathsAdj = (subjBaths - l.baths) * 20000
      const ageAdj = 0
      const lotAdj = 0
      const timeAdj = 0
      const totalAdj = sqftAdj + bedsAdj + bathsAdj + ageAdj + lotAdj + timeAdj
      const adjustedPrice = l.price + totalAdj
      return {
        ...l,
        distanceMiles: +dist.toFixed(2),
        pricePerSqft: +(pricePerSqft).toFixed(0) as unknown as number,
        similarityScore: Math.max(0, 1 - (Math.abs(sqftAdj) / (subjSqft * basePpsf))),
        adjustments: { sqftAdj: Math.round(sqftAdj), bedsAdj, bathsAdj, ageAdj, lotAdj, timeAdj, totalAdj: Math.round(totalAdj) },
        price: Math.round(adjustedPrice),
      } as Comp
    })

    const prices = comps.map(c => c.price).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    const suggestedPrice = Math.round(median)
    const pricePerSqft = Math.round(suggestedPrice / subjSqft)
    const range = { low: Math.round(prices[1] ?? prices[0]), high: Math.round(prices[prices.length - 2] ?? prices[prices.length - 1]) }
    return {
      subjectEstimate: {
        suggestedPrice,
        pricePerSqft,
        range,
        methodology: 'Median of adjusted nearby closed comps within ~2–3 miles, normalized for sqft/beds/baths.'
      },
      comps
    }
  }
}
