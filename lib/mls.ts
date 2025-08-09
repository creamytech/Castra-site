export interface ListingSpec {
  address: string
  price: number
  beds: number
  baths: number
  sqft: number
  lotSize: string
  yearBuilt: number
  propertyType: string
  style: string
  features: string[]
  description: string
}

const mockListings: Record<string, ListingSpec> = {
  '123 Elm St': {
    address: '123 Elm St',
    price: 425000,
    beds: 3,
    baths: 2,
    sqft: 1850,
    lotSize: '0.25 acres',
    yearBuilt: 1985,
    propertyType: 'Single Family',
    style: 'Traditional',
    features: ['Updated Kitchen', 'Hardwood Floors', 'Fenced Yard', 'Garage'],
    description: 'Charming 3-bedroom home with modern updates and great curb appeal.'
  },
  '456 Oak Ave': {
    address: '456 Oak Ave',
    price: 675000,
    beds: 4,
    baths: 3,
    sqft: 2400,
    lotSize: '0.5 acres',
    yearBuilt: 1992,
    propertyType: 'Single Family',
    style: 'Colonial',
    features: ['Master Suite', 'Finished Basement', 'Deck', 'Fireplace'],
    description: 'Spacious colonial with plenty of room for growing families.'
  },
  '789 Pine Dr': {
    address: '789 Pine Dr',
    price: 325000,
    beds: 2,
    baths: 1,
    sqft: 1200,
    lotSize: '0.15 acres',
    yearBuilt: 1978,
    propertyType: 'Single Family',
    style: 'Ranch',
    features: ['Updated Bathroom', 'New Roof', 'Storage Shed', 'Patio'],
    description: 'Cozy ranch-style home perfect for first-time buyers or downsizers.'
  },
  '321 Maple Ln': {
    address: '321 Maple Ln',
    price: 850000,
    beds: 5,
    baths: 4,
    sqft: 3200,
    lotSize: '1.2 acres',
    yearBuilt: 2005,
    propertyType: 'Single Family',
    style: 'Contemporary',
    features: ['Gourmet Kitchen', 'Home Office', 'Pool', '3-Car Garage'],
    description: 'Luxury contemporary home with high-end finishes and amenities.'
  },
  '654 Birch Rd': {
    address: '654 Birch Rd',
    price: 275000,
    beds: 2,
    baths: 2,
    sqft: 1100,
    lotSize: '0.1 acres',
    yearBuilt: 1980,
    propertyType: 'Townhouse',
    style: 'Townhouse',
    features: ['End Unit', 'Balcony', 'Assigned Parking', 'Low HOA'],
    description: 'Well-maintained townhouse with convenient location and low maintenance.'
  }
}

export function getListingByAddress(address: string): ListingSpec | null {
  // Normalize address for matching
  const normalizedAddress = address.toLowerCase().trim()
  
  // Try exact match first
  for (const [key, listing] of Object.entries(mockListings)) {
    if (key.toLowerCase() === normalizedAddress) {
      return listing
    }
  }
  
  // Try partial match
  for (const [key, listing] of Object.entries(mockListings)) {
    if (key.toLowerCase().includes(normalizedAddress) || 
        normalizedAddress.includes(key.toLowerCase())) {
      return listing
    }
  }
  
  return null
}
