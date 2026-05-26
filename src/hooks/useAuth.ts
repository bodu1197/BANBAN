// @client-reason: Client-side authentication state hook
"use client";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Auth User 의 user_metadata 에서 우리가 적극적으로 읽는 known fields.
 * 임의의 추가 키도 들어올 수 있으므로 `& Record<string, unknown>` 으로 확장 허용.
 */
type AuthUserMetadata = {
  nickname?: string;
  contact?: string;
  message_push_enabled?: boolean;
  avatar_url?: string;
  username?: string;
} & Record<string, unknown>;

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: AuthUserMetadata;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
  role?: string;
}

interface Artist {
  id: string;
  title: string;
  profile_image_path: string | null;
  type_artist: string;
}

type Role = "user" | "artist";

interface UseAuthReturn {
  user: AuthUser | null;
  artist: Artist | null;
  role: Role | null;
  isLoading: boolean;
  /** profiles.role === 'artist' — 시술사로 가입했는지 */
  isArtist: boolean;
  /** artists 행 존재 여부 — 샵 정보를 등록했는지 */
  hasShop: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

function normalizeRole(raw: unknown): Role {
  return raw === "artist" ? "artist" : "user";
}

/** Lazily resolve the browser Supabase client (avoids pulling ~200 KB into the initial bundle). */
async function getClient(): Promise<SupabaseClient> {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialFetchDone = useRef(false);

  const fetchUserAndArtist = useCallback(async () => {
    const supabase = await getClient();

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // 아티스트 행 + profiles.role 병렬 조회
        // 아티스트가 아닌 회원도 조회 시도 — maybeSingle 로 안전.
        const [{ data: artistData }, { data: profileData }] = await Promise.all([
          supabase
            .from("artists")
            .select("id, title, profile_image_path, type_artist")
            .eq("user_id", authUser.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("role")
            .eq("id", authUser.id)
            .maybeSingle(),
        ]);

        setUser(authUser);
        setArtist(artistData);
        setRole(normalizeRole(profileData?.role));
      } else {
        setUser(null);
        setArtist(null);
        setRole(null);
      }
    } catch {
      setUser(null);
      setArtist(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 초기 로딩 한 번만 실행
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchUserAndArtist();
    }

    let subscription: { unsubscribe: () => void } | null = null;

    getClient().then((supabase) => {
      const { data } = supabase.auth.onAuthStateChange((event: string) => {
        // 로그인/로그아웃 이벤트에서만 다시 조회 (INITIAL_SESSION 제외)
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          fetchUserAndArtist();
        }
      });
      subscription = data.subscription;
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserAndArtist]);

  const logout = useCallback(async () => {
    const { signOut } = await import("@/lib/supabase/auth-client");
    await signOut();
    setUser(null);
    setArtist(null);
    setRole(null);
    globalThis.location.href = "/";
  }, []);

  const refresh = useCallback(async () => {
    await fetchUserAndArtist();
  }, [fetchUserAndArtist]);

  return {
    user,
    artist,
    role,
    isLoading,
    isArtist: role === "artist",
    hasShop: artist !== null,
    logout,
    refresh,
  };
}
