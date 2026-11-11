const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export interface AgencyData {
  name: { ar: string; fr: string };
  licenceNumber: string;
  email: string;
  phoneNumbers: string[];
  whatsappNumber: string;
  socialLinks?: Record<string, string>;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
  settings?: Record<string, any>;
}

export interface DestinationItem {
  id: string;
  slug: string;
  name: { ar: string; fr: string };
  category: "domestic" | "sahara" | "international" | "religious";
  wilayaOrCountry: string;
  description: { ar: string; fr: string };
  coverImageUrl?: string;
  galleryImages?: string[];
  isFeatured: boolean;
  highlights?: { ar: string[]; fr: string[] };
  bestTimeToVisit?: { ar: string; fr: string };
}

export interface DepartureItem {
  id: string;
  departureDate: string;
  returnDate: string;
  maxCapacity: number;
  bookedPlaces: number;
  status: "open" | "limited" | "closed" | "completed" | "cancelled";
}

export interface TravelOfferItem {
  id: string;
  slug: string;
  title: { ar: string; fr: string };
  destinationId: string;
  destinationName?: { ar: string; fr: string };
  tripType: string;
  durationDays: number;
  durationNights: number;
  basePriceCentimes: number;
  currency: string;
  pricingBasis: string;
  availabilityStatus: "available" | "limited" | "sold_out" | "request_only";
  coverImageUrl?: string;
  photos?: string[];
  hotelDetails?: { ar: string; fr: string };
  transportDetails?: { ar: string; fr: string };
  itinerary?: {
    dayNumber: number;
    title: { ar: string; fr: string };
    description: { ar: string; fr: string };
  }[];
  inclusions?: { ar: string[]; fr: string[] };
  exclusions?: { ar: string[]; fr: string[] };
  departures?: DepartureItem[];
  isPublished: boolean;
}

export async function fetchAgency(): Promise<AgencyData> {
  const res = await fetch(`${API_BASE}/public/agency`);
  if (!res.ok) throw new Error("Failed to load agency data");
  const json = await res.json();
  return json.data;
}

export async function fetchDestinations(params?: {
  featured?: boolean;
  category?: string;
  search?: string;
}): Promise<DestinationItem[]> {
  const query = new URLSearchParams();
  if (params?.featured) query.set("featured", "true");
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`${API_BASE}/public/destinations?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load destinations");
  const json = await res.json();
  return json.data || [];
}

export async function fetchDestinationBySlug(slug: string): Promise<DestinationItem> {
  const res = await fetch(`${API_BASE}/public/destinations/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("Destination not found");
  const json = await res.json();
  return json.data;
}

export async function fetchOffers(params?: {
  page?: number;
  limit?: number;
  destinationId?: string;
  tripType?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<{
  offers: TravelOfferItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.destinationId) query.set("destinationId", params.destinationId);
  if (params?.tripType) query.set("tripType", params.tripType);
  if (params?.search) query.set("search", params.search);
  if (params?.minPrice) query.set("minPrice", String(params.minPrice));
  if (params?.maxPrice) query.set("maxPrice", String(params.maxPrice));

  const res = await fetch(`${API_BASE}/public/offers?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load offers");
  const json = await res.json();
  return {
    offers: json.offers || [],
    pagination: json.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 },
  };
}

export async function fetchOfferBySlug(slug: string): Promise<TravelOfferItem> {
  const res = await fetch(`${API_BASE}/public/offers/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("Offer not found");
  const json = await res.json();
  return json.data;
}

export async function submitPublicEnquiry(payload: {
  fullName: string;
  phone: string;
  email?: string;
  offerId?: string;
  preferredDate?: string;
  travellersCount: number;
  message?: string;
  source?: string;
  idempotencyKey?: string;
  websiteUrl_hp?: string;
}): Promise<{
  success: boolean;
  id: string;
  enquiryNumber: string;
  status: string;
  idempotentReplay?: boolean;
}> {
  const res = await fetch(`${API_BASE}/public/enquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to submit enquiry");
  }

  return json;
}

