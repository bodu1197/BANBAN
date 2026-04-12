// @client-reason: Client-side authentication state hook
"use client";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback, useRef } from "react";

/** Minimal user type to avoid importing @supabase/supabase-js at module level.
 *  Uses index signature so it stays compatible with Supabase User at runtime. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AuthUser { id: string; email?: string; user_metadata?: Record<string, any>; [key: string]: any }

interface Artist {
  id: string;
  title: string;
  profile_image_path: string | null;
  type_artist: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  artist: Artist | null;
  isLoading: boolean;
  isArtist: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Lazily resolve the browser Supabase client (avoids pulling ~200 KB into the initial bundle). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClient(): Promise<any> {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialFetchDone = useRef(false);

  const fetchUserAndArtist = useCallback(async () => {
    const supabase = await getClient();

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // 아티스트 정보 조회 (아티스트가 아닐 수 있으므로 maybeSingle 사용)
        const { data: artistData } = await supabase
          .from("artists")
          .select("id, title, profile_image_path, type_artist")
          .eq("user_id", authUser.id)
          .maybeSingle();

        setUser(authUser);
        setArtist(artistData);
      } else {
        setUser(null);
        setArtist(null);
      }
    } catch {
      setUser(null);
      setArtist(null);
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
    globalThis.location.href = "/";
  }, []);

  const refresh = useCallback(async () => {
    await fetchUserAndArtist();
  }, [fetchUserAndArtist]);

  return {
    user,
    artist,
    isLoading,
    isArtist: artist !== null,
    logout,
    refresh,
  };
}
