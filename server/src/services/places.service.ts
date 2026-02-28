/**
 * Google Places API service
 *
 * Wraps the Places API (New) v1 endpoints used by Chikn Tndr:
 *  - Nearby Search  → find restaurants near a coordinate
 *  - Place Details  → enrich a place with photos, hours, etc.
 *  - Place Photos   → resolve a photo reference to a CDN URL
 *
 * Results are cached in the `restaurants` table to minimise API spend.
 */

import axios, { AxiosInstance } from "axios";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type { RestaurantCard } from "../types";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const PHOTO_MAX_WIDTH = 800;

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  types: string[];
  opening_hours?: { open_now?: boolean };
  website?: string;
  formatted_phone_number?: string;
  url?: string;
}

export class PlacesService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: PLACES_BASE, timeout: 8_000 });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetch up to `limit` restaurant cards near the given coordinates.
   * Results are upserted into the DB for caching.
   */
  async getNearbyRestaurants(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number,
  ): Promise<RestaurantCard[]> {
    let places = await this.nearbySearch(lat, lng, radiusMeters);

    // Shuffle for variety and cap to limit
    places = shuffle(places).slice(0, limit);

    const cards: RestaurantCard[] = [];

    for (const place of places) {
      try {
        const card = await this.upsertRestaurant(place, lat, lng);
        cards.push(card);
      } catch (err) {
        logger.warn("Failed to upsert restaurant", {
          placeId: place.place_id,
          err,
        });
      }
    }

    return cards;
  }

  /**
   * Resolve a photo reference to a served image URL.
   * Returns null if no reference is available.
   */
  resolvePhotoUrl(photoReference: string | null | undefined): string | null {
    if (!photoReference) return null;
    return (
      `${PLACES_BASE}/photo` +
      `?maxwidth=${PHOTO_MAX_WIDTH}` +
      `&photo_reference=${encodeURIComponent(photoReference)}` +
      `&key=${env.GOOGLE_PLACES_API_KEY}`
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async nearbySearch(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<GooglePlace[]> {
    const { data } = await this.http.get<{
      results: GooglePlace[];
      status: string;
      error_message?: string;
    }>("/nearbysearch/json", {
      params: {
        location: `${lat},${lng}`,
        radius,
        type: "restaurant",
        key: env.GOOGLE_PLACES_API_KEY,
      },
    });

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Places API error: ${data.status} — ${data.error_message ?? ""}`,
      );
    }

    return data.results;
  }

  private async upsertRestaurant(
    place: GooglePlace,
    originLat: number,
    originLng: number,
  ): Promise<RestaurantCard> {
    const photoRef = place.photos?.[0]?.photo_reference ?? null;
    const photoUrl = this.resolvePhotoUrl(photoRef);
    const distance = haversineMeters(
      originLat,
      originLng,
      place.geometry.location.lat,
      place.geometry.location.lng,
    );

    const data = {
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      rating: place.rating ?? null,
      userRatingsTotal: place.user_ratings_total ?? null,
      priceLevel: place.price_level ?? null,
      photoReference: photoRef,
      photoUrl,
      types: place.types,
      openNow: place.opening_hours?.open_now ?? null,
      website: place.website ?? null,
      phoneNumber: place.formatted_phone_number ?? null,
      googleMapsUrl: place.url ?? null,
      cachedAt: new Date(),
    };

    const restaurant = await prisma.restaurant.upsert({
      where: { placeId: place.place_id },
      create: data,
      update: data,
    });

    return {
      id: restaurant.id,
      placeId: restaurant.placeId,
      name: restaurant.name,
      address: restaurant.address,
      rating: restaurant.rating,
      userRatingsTotal: restaurant.userRatingsTotal,
      priceLevel: restaurant.priceLevel,
      photoUrl: restaurant.photoUrl,
      types: restaurant.types,
      openNow: restaurant.openNow,
      googleMapsUrl: restaurant.googleMapsUrl,
      distance,
    };
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Haversine distance in metres between two lat/lng points */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const placesService = new PlacesService();
