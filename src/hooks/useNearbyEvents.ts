// @client-reason: React Query 클라이언트 훅 — 위치 기반 events 실시간 페칭
"use client";

import { useQuery } from "@tanstack/react-query";
import type { EventCardData } from "@/lib/supabase/event-queries";

interface NearbyEventApiRow extends Omit<EventCardData, "hero_image"> {
  hero_image: string | null;
  distanceKm: number | null;
}

interface NearbyApiResponse {
  events: NearbyEventApiRow[];
  totalCount: number;
}

async function fetchNearby(lat: number, lng: number): Promise<{ events: EventCardData[]; totalCount: number }> {
  const res = await fetch(`/api/events/nearby?lat=${lat}&lng=${lng}&radius=50&limit=50`);
  if (!res.ok) throw new Error("nearby events fetch failed");
  const json = (await res.json()) as NearbyApiResponse;
  return { events: json.events as EventCardData[], totalCount: json.totalCount };
}

export function useNearbyEvents(lat: number | null, lng: number | null): {
  events: EventCardData[];
  isLoading: boolean;
  totalCount: number;
} {
  const enabled = lat !== null && lng !== null;

  const { data, isLoading } = useQuery({
    queryKey: ["nearby-events", lat, lng],
    queryFn: () => fetchNearby(lat as number, lng as number),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    events: data?.events ?? [],
    isLoading: enabled && isLoading,
    totalCount: data?.totalCount ?? 0,
  };
}
