import { createStaticClient } from "./server";
import { getAvatarUrl } from "./storage-utils";

export type PostBoardType = "QNA" | "FREETALK";
export type PostCategoryType = "BEAUTY";
export type PostSortType = "latest" | "popular" | "recommended";

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  typeBoard: string;
  typePost: string;
  authorNickname: string | null;
  authorAvatar: string | null;
  authorId: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  reportsCount: number;
  createdAt: string;
  imageUrl: string | null;
  youtubeUrl: string | null;
}

export interface CommunityPostDetail extends CommunityPost {
  comments: PostComment[];
}

export interface PostComment {
  id: string;
  content: string;
  parentId: string | null;
  authorNickname: string | null;
  authorAvatar: string | null;
  authorId: string | null;
  createdAt: string;
  legacyId: number | null;
}

interface PostRow {
  id: string;
  title: string;
  content: string;
  type_board: string;
  type_post: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  reports_count: number | null;
  created_at: string;
  user_id: string | null;
  image_url: string | null;
  youtube_url: string | null;
  profile: {
    nickname: string | null;
    profile_image_path: string | null;
  } | null;
}

interface CommentRow {
  id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  user_id: string | null;
  legacy_id: number | null;
  profile: {
    nickname: string | null;
    profile_image_path: string | null;
  } | null;
}

function mapPostRow(row: PostRow): CommunityPost {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    typeBoard: row.type_board,
    typePost: row.type_post,
    authorNickname: row.profile?.nickname ?? null,
    authorAvatar: row.profile?.profile_image_path
      ? getAvatarUrl(row.profile.profile_image_path)
      : null,
    authorId: row.user_id,
    viewsCount: row.views_count,
    likesCount: row.likes_count,
    commentsCount: row.comments_count,
    reportsCount: row.reports_count ?? 0,
    createdAt: row.created_at,
    imageUrl: row.image_url,
    youtubeUrl: row.youtube_url,
  };
}

function mapCommentRow(row: CommentRow): PostComment {
  return {
    id: row.id,
    content: row.content,
    parentId: row.parent_id,
    authorNickname: row.profile?.nickname ?? null,
    authorAvatar: row.profile?.profile_image_path
      ? getAvatarUrl(row.profile.profile_image_path)
      : null,
    authorId: row.user_id,
    createdAt: row.created_at,
    legacyId: row.legacy_id,
  };
}

async function fetchCommunityPostsInternal(options: {
  typeBoard?: PostBoardType;
  typePost?: PostCategoryType;
  sort?: PostSortType;
  limit?: number;
}): Promise<CommunityPost[]> {
  const { typeBoard, typePost, sort = "latest", limit = 50 } = options;
  const supabase = createStaticClient();

  let query = supabase
    .from("posts")
    .select(`
      id, title, content, type_board, type_post, views_count, likes_count, comments_count, reports_count, created_at, user_id, image_url, youtube_url,
      profile:profiles!user_id(nickname, profile_image_path)
    `)
    .is("deleted_at", null)
    .limit(limit);

  if (typeBoard) {
    query = query.eq("type_board", typeBoard);
  }
  if (typePost) {
    query = query.eq("type_post", typePost);
  }

  if (sort === "popular") {
    query = query.order("views_count", { ascending: false });
  } else if (sort === "recommended") {
    query = query.order("likes_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch community posts: ${error.message}`);
  }

  return (data ?? []).map((row) => mapPostRow(row as unknown as PostRow));
}

export async function fetchCommunityPosts(options?: {
  typeBoard?: PostBoardType;
  typePost?: PostCategoryType;
  sort?: PostSortType;
  limit?: number;
}): Promise<CommunityPost[]> {
  return fetchCommunityPostsInternal(options ?? {});
}

export async function fetchPostById(id: string): Promise<CommunityPostDetail | null> {
  const supabase = createStaticClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(`
      id, title, content, type_board, type_post, views_count, likes_count, comments_count, reports_count, created_at, user_id, image_url, youtube_url,
      profile:profiles!user_id(nickname, profile_image_path)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (postError || !post) return null;

  const { data: comments } = await supabase
    .from("comments")
    .select(`
      id, content, parent_id, created_at, user_id, legacy_id,
      profile:profiles!user_id(nickname, profile_image_path)
    `)
    .eq("post_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const mappedPost = mapPostRow(post as unknown as PostRow);

  return {
    ...mappedPost,
    comments: (comments ?? []).map((c) => mapCommentRow(c as unknown as CommentRow)),
  };
}
