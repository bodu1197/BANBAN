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
  /** profiles.profile_image_path — SNS 가입자 아바타 (callback 에서 다운로드+저장) */
  profileImagePath: string | null;
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

/** 두 artist 가 동일한지(참조 유지 판단용) — 변경 없을 때 setState 가 prev 를 그대로 반환해 리렌더 회피. */
function sameArtist(a: Artist | null, b: Artist | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.title === b.title
    && a.profile_image_path === b.profile_image_path && a.type_artist === b.type_artist;
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
  const [profileImagePath, setProfileImagePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialFetchDone = useRef(false);
  // 현재 로그인 유저 id — SIGNED_IN(탭 포커스 복귀 시 Supabase 가 재발화) 에서 실제 유저 변경 여부 판별용
  const currentUserIdRef = useRef<string | null>(null);

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
            .select("role, profile_image_path")
            .eq("id", authUser.id)
            .maybeSingle(),
        ]);

        currentUserIdRef.current = authUser.id;
        setUser(authUser);
        setArtist(artistData);
        setRole(normalizeRole(profileData?.role));
        setProfileImagePath(profileData?.profile_image_path ?? null);
      } else {
        currentUserIdRef.current = null;
        setUser(null);
        setArtist(null);
        setRole(null);
        setProfileImagePath(null);
      }
    } catch {
      currentUserIdRef.current = null;
      setUser(null);
      setArtist(null);
      setRole(null);
      setProfileImagePath(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // TOKEN_REFRESHED 시 role/artist/avatar drift 만 반영 — 실제 변경이 있을 때만 set 해서
  // 불필요한 user 객체 재생성/리렌더(탭 깜빡임)를 피한다(M14: 가입 직후 승격 등 stale 방지).
  const syncRoleArtistIfChanged = useCallback(async () => {
    const supabase = await getClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const [{ data: artistData }, { data: profileData }] = await Promise.all([
      supabase.from("artists").select("id, title, profile_image_path, type_artist").eq("user_id", authUser.id).maybeSingle(),
      supabase.from("profiles").select("role, profile_image_path").eq("id", authUser.id).maybeSingle(),
    ]);
    const nextArtist = artistData as Artist | null;
    setArtist((prev) => (sameArtist(prev, nextArtist) ? prev : nextArtist));
    setRole((prev) => { const next = normalizeRole(profileData?.role); return prev === next ? prev : next; });
    setProfileImagePath((prev) => { const next = profileData?.profile_image_path ?? null; return prev === next ? prev : next; });
  }, []);

  useEffect(() => {
    // 초기 로딩 한 번만 실행
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchUserAndArtist();
    }

    let subscription: { unsubscribe: () => void } | null = null;

    getClient().then((supabase) => {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // SIGNED_OUT 은 항상 재조회. SIGNED_IN 은 '실제 유저 변경' 시에만 —
        // Supabase 는 탭 포커스 복귀마다 SIGNED_IN 을 재발화하는데, 매번 재조회하면 새 user 객체가
        // 생성돼 구독 페이지(예: /admin/ad-grants)가 데이터 재페치 + 로딩스피너로 깜빡 = "페이지 자동 새로고침".
        // INITIAL_SESSION 은 무시. TOKEN_REFRESHED 는 role/artist 변경분만 반영(M14, 깜빡임 없음).
        if (event === "SIGNED_OUT") {
          fetchUserAndArtist();
        } else if (event === "SIGNED_IN") {
          const newId = session?.user?.id ?? null;
          if (newId && newId !== currentUserIdRef.current) {
            // fetch 전에 ref 선반영 — 초기 로드 race(첫 SIGNED_IN 이 초기 fetch 전 도착) + 동시 SIGNED_IN 중복 fetch 방지.
            currentUserIdRef.current = newId;
            fetchUserAndArtist();
          }
        } else if (event === "TOKEN_REFRESHED") {
          void syncRoleArtistIfChanged();
        }
      });
      subscription = data.subscription;
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserAndArtist, syncRoleArtistIfChanged]);

  const logout = useCallback(async () => {
    const { signOut } = await import("@/lib/supabase/auth-client");
    await signOut();
    setUser(null);
    setArtist(null);
    setRole(null);
    setProfileImagePath(null);
    globalThis.location.href = "/";
  }, []);

  const refresh = useCallback(async () => {
    await fetchUserAndArtist();
  }, [fetchUserAndArtist]);

  return {
    user,
    artist,
    role,
    profileImagePath,
    isLoading,
    isArtist: role === "artist",
    hasShop: artist !== null,
    logout,
    refresh,
  };
}
