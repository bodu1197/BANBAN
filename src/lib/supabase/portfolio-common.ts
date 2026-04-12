import { getStorageUrl, getAvatarUrl } from "./storage-utils";

export interface HomePortfolio {
  id: string;
  artistId: string;
  title: string;
  priceOrigin: number;
  price: number;
  discountRate: number;
  saleEndedAt: string | null;
  likesCount: number;
  imageUrl: string | null;
  artistName: string;
  artistRegion: string | null;
  artistProfileImage: string | null;
  artistType?: string;
}

export interface PortfolioRow {
  id: string;
  artist_id: string;
  title: string;
  price_origin: number;
  price: number;
  discount_rate: number;
  sale_ended_at: string | null;
  likes_count: number;
  portfolio_media: Array<{ storage_path: string; order_index: number }>;
  artist: { title: string; address: string; profile_image_path: string | null; region: { name: string } | null } | null;
}

export interface PortfolioRowWithType extends PortfolioRow {
  artist: {
    title: string;
    address: string;
    profile_image_path: string | null;
    type_artist: string;
    is_hide: boolean;
    deleted_at: string | null;
    status: string;
    portfolio_media_count: number;
    region: { name: string } | null;
  } | null;
}

export const SELECT_BASIC = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!artist_id(title, address, profile_image_path, region:regions(name))
`;

export const SELECT_WITH_TYPE = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!artist_id(title, address, profile_image_path, type_artist, is_hide, deleted_at, status, portfolio_media_count, region:regions(name))
`;

export function extractArtistInfo(artist: PortfolioRow["artist"]): { name: string; region: string | null; profileImage: string | null } {
  if (!artist) return { name: "", region: null, profileImage: null };
  return {
    name: artist.title,
    region: artist.region?.name ?? artist.address,
    profileImage: artist.profile_image_path,
  };
}

export function mapPortfolioRow(row: PortfolioRow): HomePortfolio {
  const sorted = [...(row.portfolio_media ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const artistInfo = extractArtistInfo(row.artist);
  return {
    id: row.id,
    artistId: row.artist_id,
    title: row.title,
    priceOrigin: row.price_origin,
    price: row.price,
    discountRate: row.discount_rate,
    saleEndedAt: row.sale_ended_at,
    likesCount: row.likes_count,
    imageUrl: sorted[0] ? getStorageUrl(sorted[0].storage_path) : null,
    artistName: artistInfo.name,
    artistRegion: artistInfo.region,
    artistProfileImage: artistInfo.profileImage ? getAvatarUrl(artistInfo.profileImage) : null,
  };
}
