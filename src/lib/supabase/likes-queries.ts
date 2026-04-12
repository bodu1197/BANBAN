// @client-reason: Used in client components for fetching liked items
"use client";

import { createClient } from "./client";
import { getStorageUrl, getAvatarUrl } from "./storage-utils";

export interface LikedPortfolio {
  id: string;
  imageUrl: string | null;
}

export interface LikedArtist {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface LikeRecord {
  likeable_id: string;
}

interface PortfolioMedia {
  storage_path: string;
  order_index: number;
}

interface PortfolioRecord {
  id: string;
  portfolio_media: PortfolioMedia[] | null;
}

interface ArtistRecord {
  id: string;
  title: string;
  profile_image_path: string | null;
}

/**
 * 사용자가 좋아요한 포트폴리오 목록 조회 (최적화)
 * - 2단계 쿼리로 분리하여 조인 오버헤드 제거
 */
export async function fetchLikedPortfolios(
  userId: string,
  limit: number = 5
): Promise<LikedPortfolio[]> {
  const supabase = createClient();

  // 1단계: 좋아요한 포트폴리오 ID 조회
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("likeable_id")
    .eq("user_id", userId)
    .eq("likeable_type", "Portfolio")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (likesError || !likes || likes.length === 0) {
    return [];
  }

  const typedLikes = likes as unknown as LikeRecord[];
  const portfolioIds = typedLikes.map((l) => l.likeable_id);

  // 2단계: 포트폴리오 상세 정보 조회
  const { data: portfolios, error: portfoliosError } = await supabase
    .from("portfolios")
    .select("id, portfolio_media(storage_path, order_index)")
    .in("id", portfolioIds);

  if (portfoliosError || !portfolios) {
    return [];
  }

  const typedPortfolios = portfolios as unknown as PortfolioRecord[];

  // ID 순서 유지를 위한 맵 생성
  const portfolioMap = new Map(typedPortfolios.map((p) => [p.id, p]));

  return portfolioIds
    .map((id) => portfolioMap.get(id))
    .filter((p): p is PortfolioRecord => p !== undefined)
    .map((portfolio) => {
      const sortedMedia = [...(portfolio.portfolio_media || [])].sort(
        (a, b) => a.order_index - b.order_index
      );
      const firstImage = sortedMedia[0]?.storage_path;

      return {
        id: portfolio.id,
        imageUrl: firstImage ? getStorageUrl(firstImage) : null,
      };
    });
}

/**
 * 사용자가 좋아요한 아티스트 목록 조회 (최적화)
 * - 2단계 쿼리로 분리하여 조인 오버헤드 제거
 */
export async function fetchLikedArtists(
  userId: string,
  limit: number = 5
): Promise<LikedArtist[]> {
  const supabase = createClient();

  // 1단계: 좋아요한 아티스트 ID 조회
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("likeable_id")
    .eq("user_id", userId)
    .eq("likeable_type", "Artist")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (likesError || !likes || likes.length === 0) {
    return [];
  }

  const typedLikes = likes as unknown as LikeRecord[];
  const artistIds = typedLikes.map((l) => l.likeable_id);

  // 2단계: 아티스트 상세 정보 조회
  const { data: artists, error: artistsError } = await supabase
    .from("artists")
    .select("id, title, profile_image_path")
    .in("id", artistIds);

  if (artistsError || !artists) {
    return [];
  }

  const typedArtists = artists as unknown as ArtistRecord[];

  // ID 순서 유지를 위한 맵 생성
  const artistMap = new Map(typedArtists.map((a) => [a.id, a]));

  return artistIds
    .map((id) => artistMap.get(id))
    .filter((a): a is ArtistRecord => a !== undefined)
    .map((artist) => ({
      id: artist.id,
      name: artist.title,
      imageUrl: artist.profile_image_path
        ? getAvatarUrl(artist.profile_image_path)
        : null,
    }));
}
