export type Listing = {
  id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  lat: number;
  lng: number;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft?: number;
  yearBuilt?: number;
  daysOnMarket: number;
  propertyType: "Single Family" | "Condo" | "Townhouse" | "Multi";
  thumbnailUrl: string;
  imageUrls: string[];
  mlsId?: string;
  url?: string;
  status: "Active" | "Pending" | "Closed";
  closedDate?: string;
};

export type SearchQuery = {
  city?: string;
  zipcode?: string;
  priceMin?: number;
  priceMax?: number;
  bedsMin?: number;
  bathsMin?: number;
  propertyType?: Listing["propertyType"];
  limit?: number;
  radiusMiles?: number;
  lat?: number;
  lng?: number;
  text?: string;
};

export type Comp = Listing & {
  distanceMiles: number;
  pricePerSqft: number;
  similarityScore: number;
  adjustments?: {
    sqftAdj: number;
    bedsAdj: number;
    bathsAdj: number;
    ageAdj: number;
    lotAdj: number;
    timeAdj: number;
    totalAdj: number;
  };
};

export interface MlsProvider {
  searchListings(q: SearchQuery): Promise<Listing[]>;
  getComps(subject: { address?: string; lat?: number; lng?: number; city?: string; beds?: number; baths?: number; sqft?: number }): Promise<{
    subjectEstimate: {
      suggestedPrice: number;
      pricePerSqft: number;
      range: { low: number; high: number };
      methodology: string;
    };
    comps: Comp[];
  }>; 
}
