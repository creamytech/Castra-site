type Listing = { id: string; address: string; city: string; price: number; beds: number; baths: number; image?: string; url?: string }

const API = process.env.MLS_API_BASE
const KEY = process.env.MLS_API_KEY

export async function searchListings(query: { city?: string; priceMin?: number; priceMax?: number; beds?: number; baths?: number }): Promise<Listing[]> {
  if (!API || !KEY) {
    // mock
    return [
      { id: 'm1', address: '123 Main St', city: query.city || 'Miami', price: query.priceMin || 650000, beds: query.beds || 3, baths: query.baths || 2, image: 'https://picsum.photos/seed/1/300/200', url: '#' },
      { id: 'm2', address: '45 Ocean Dr', city: query.city || 'Miami', price: (query.priceMax || 850000), beds: (query.beds || 3), baths: (query.baths || 2), image: 'https://picsum.photos/seed/2/300/200', url: '#' },
      { id: 'm3', address: '789 Bayshore', city: query.city || 'Miami', price: ((query.priceMin || 600000) + 50000), beds: (query.beds || 3), baths: (query.baths || 2), image: 'https://picsum.photos/seed/3/300/200', url: '#' },
    ]
  }
  // TODO: implement RESO Web API
  return []
}

export async function getComps(address: string): Promise<{ address: string; recentSales: Array<{ address: string; price: number; date: string }> }> {
  if (!API || !KEY) {
    return { address, recentSales: [ { address: '111 Nearby Ave', price: 720000, date: new Date().toISOString() }, { address: '222 Close St', price: 705000, date: new Date().toISOString() } ] }
  }
  // TODO: implement RESO comps
  return { address, recentSales: [] }
}
