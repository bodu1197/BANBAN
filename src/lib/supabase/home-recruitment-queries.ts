import { createClient, createStaticClient } from "./server";
import { getAvatarUrl, getStorageUrl } from "./storage-utils";
import type { Category } from "@/types/database";
import type { ArtistTypeFilter } from "./home-artist-queries";
import { secureShuffle } from "@/lib/random";

export interface HomeRecruitment {
  id: string;
  title: string;
  description: string | null;
  parts: string | null;
  expense: number;
  closedAt: string | null;
  condition: string | null;
  artistId: string;
  artistName: string;
  artistProfileImage: string | null;
  thumbnailImage: string | null;
}

// === Internal types ===

interface RecruitmentRow {
  id: string;
  title: string;
  description: string | null;
  parts: string | null;
  expense: number;
  closed_at: string | null;
  condition: string | null;
  artist: {
    id: string;
    title: string;
    profile_image_path: string | null;
    type_artist?: string;
    portfolios?: Array<{
      portfolio_media: Array<{ storage_path: string; order_index: number }>;
    }>;
  } | null;
}

function getFirstPortfolioImage(artist: RecruitmentRow["artist"]): string | null {
  const portfolios = artist?.portfolios ?? [];
  for (const p of portfolios) {
    const media = [...(p.portfolio_media ?? [])].sort((a, b) => a.order_index - b.order_index);
    if (media.length > 0) return getStorageUrl(media[0].storage_path);
  }
  return null;
}

function mapRecruitmentRow(row: RecruitmentRow): HomeRecruitment {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    parts: row.parts,
    expense: row.expense,
    closedAt: row.closed_at,
    condition: row.condition,
    artistId: row.artist?.id ?? "",
    artistName: row.artist?.title ?? "",
    artistProfileImage: row.artist?.profile_image_path
      ? getAvatarUrl(row.artist.profile_image_path)
      : null,
    thumbnailImage: getFirstPortfolioImage(row.artist),
  };
}

const shuffleArray = secureShuffle;

function filterByArtistType(
  rows: RecruitmentRow[],
  typeArtist?: ArtistTypeFilter,
): RecruitmentRow[] {
  if (!typeArtist) return rows;
  return rows.filter((row) => {
    const artistType = row.artist?.type_artist;
    return artistType === typeArtist;
  });
}

async function fetchRecruitmentsInternal(
  limit: number,
  typeArtist?: ArtistTypeFilter,
): Promise<HomeRecruitment[]> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from("recruitments")
    .select(`
      id, title, description, parts, expense, closed_at, condition,
      artist:artists!artist_id(
        id, title, profile_image_path, type_artist,
        portfolios(portfolio_media(storage_path, order_index))
      )
    `)
    .is("deleted_at", null)
    .or(`closed_at.is.null,closed_at.gte.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recruitments: ${error.message}`);
  }

  const rows = filterByArtistType((data ?? []) as RecruitmentRow[], typeArtist);
  return shuffleArray(rows.map(mapRecruitmentRow));
}

export async function fetchRecruitments(options?: {
  limit?: number;
  typeArtist?: ArtistTypeFilter;
}): Promise<HomeRecruitment[]> {
  const { limit = 10, typeArtist } = options ?? {};
  return fetchRecruitmentsInternal(limit, typeArtist);
}

export interface RecruitmentDetail extends HomeRecruitment {
  artistContact: string | null;
  artistKakaoUrl: string | null;
  artistInstagramUrl: string | null;
  artistAddress: string | null;
  artistImages: string[];
}

interface DetailRow extends RecruitmentRow {
  artist: RecruitmentRow["artist"] & {
    contact?: string | null;
    kakao_url?: string | null;
    instagram_url?: string | null;
    address?: string | null;
    address_detail?: string | null;
  } | null;
}

function collectArtistImages(artist: DetailRow["artist"], maxCount: number): string[] {
  const images: string[] = [];
  for (const p of artist?.portfolios ?? []) {
    const sorted = [...(p.portfolio_media ?? [])].sort((a, b) => a.order_index - b.order_index);
    for (const m of sorted) {
      const url = getStorageUrl(m.storage_path);
      if (url) images.push(url);
      if (images.length >= maxCount) return images;
    }
  }
  return images;
}

function mapDetailRow(row: DetailRow): RecruitmentDetail {
  const base = mapRecruitmentRow(row);
  const artist = row.artist;
  const address = [artist?.address, artist?.address_detail].filter(Boolean).join(" ") || null;

  return {
    ...base,
    artistContact: artist?.contact ?? null,
    artistKakaoUrl: artist?.kakao_url ?? null,
    artistInstagramUrl: artist?.instagram_url ?? null,
    artistAddress: address,
    artistImages: collectArtistImages(artist, 5),
  };
}

const DETAIL_SELECT = `
  id, title, description, parts, expense, closed_at, condition,
  artist:artists!artist_id(
    id, title, profile_image_path, contact, kakao_url, instagram_url, address, address_detail,
    portfolios(portfolio_media(storage_path, order_index))
  )
`;

export async function fetchRecruitmentById(id: string): Promise<RecruitmentDetail | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("recruitments")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return mapDetailRow(data as DetailRow);
}

// === Categories ===

export async function fetchCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch categories: ${error.message}`);
    return [];
  }
  return data ?? [];
}
