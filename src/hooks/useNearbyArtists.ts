"use client";

import { useQuery } from "@tanstack/react-query";
import type { ArtistListItem } from "@/lib/supabase/artist-queries";

interface NearbyApiArtist {
  id: string;
  title: string;
  address: string;
  regionName: string | null;
  likesCount: number;
  typeArtist: string;
  profileImage: string | null;
  distanceKm: number;
}

interface NearbyApiResponse {
  artists: NearbyApiArtist[];
}

async function fetchNearby(lat: number, lng: number): Promise<ArtistListItem[]> {
  const res = await fetch(`/api/artists/nearby?lat=${lat}&lng=${lng}&radius=50&limit=50`);
  if (!res.ok) throw new Error("nearby fetch failed");
  const json = (await res.json()) as NearbyApiResponse;
  return json.artists.map((a) => ({
    id: a.id,
    name: a.title,
    region: a.regionName ?? "",
    address: a.address,
    profileImage: a.profileImage,
    portfolioImages: [],
    rating: 0,
    reviewCount: 0,
    likesCount: a.likesCount,
    distanceKm: a.distanceKm,
  }));
}

export function useNearbyArtists(lat: number | null, lng: number | null) {
  const enabled = lat !== null && lng !== null;

  const { data, isLoading } = useQuery({
    queryKey: ["nearby-artists", lat, lng],
    queryFn: () => fetchNearby(lat!, lng!),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    artists: data ?? [],
    isLoading: enabled && isLoading,
    totalCount: data?.length ?? 0,
  };
}
