"use client";

import { useState, useCallback } from "react";

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export type GeoStatus = "idle" | "loading" | "success" | "denied" | "error";

export function useGeolocation(): {
  readonly position: GeoPosition | null;
  readonly status: GeoStatus;
  readonly request: () => void;
} {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setStatus("success");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  return { position, status, request } as const;
}
