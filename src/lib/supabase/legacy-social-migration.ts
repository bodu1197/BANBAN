import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Legacy Social Login Migration
 *
 * When a user logs in via OAuth (Kakao/Google/Apple), check if they have a
 * legacy profile (from the old howtattoo.com site) by matching provider_id
 * to profiles.social_id. If found, migrate all legacy data to the new auth user.
 *
 * This handles:
 * - Moving FK references (artists, posts, likes, etc.) from legacy profile to new auth user
 * - Copying legacy profile fields (username, nickname, etc.) to new profile
 * - Deleting the orphaned legacy profile
 */

const PROVIDER_TO_SOCIAL_TYPE: Record<string, string> = {
  kakao: "KAKAO",
  google: "GOOGLE",
  apple: "APPLE",
};

// All tables with FK references to profiles.id
const FK_TABLES: Array<{ table: string; column: string }> = [
  { table: "artists", column: "user_id" },
  { table: "posts", column: "user_id" },
  { table: "comments", column: "user_id" },
  { table: "likes", column: "user_id" },
  { table: "reviews", column: "user_id" },
  { table: "points", column: "user_id" },
  { table: "point_wallets", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "push_tokens", column: "user_id" },
  { table: "reports", column: "reporter_id" },
  { table: "blocks", column: "user_id" },
  { table: "blocks", column: "blocked_user_id" },
  { table: "blacklists", column: "user_id" },
  { table: "estimate_inquiries", column: "user_id" },
  { table: "estimates", column: "user_id" },
  { table: "reservations", column: "user_id" },
  { table: "chat_rooms", column: "user_id" },
  { table: "chat_messages", column: "sender_id" },
  { table: "conversations", column: "participant_1" },
  { table: "conversations", column: "participant_2" },
  { table: "messages", column: "sender_id" },
  { table: "courses", column: "artist_id" },
  { table: "course_reviews", column: "user_id" },
];

function extractProviderId(user: User): string | undefined {
  return user.user_metadata?.provider_id
    ?? user.identities?.[0]?.identity_data?.sub
    ?? user.identities?.[0]?.id;
}

function getProviderInfo(user: User): { providerId: string; socialType: string } | null {
  const provider = user.app_metadata?.provider;
  if (!provider || provider === "email") return null;

  // eslint-disable-next-line security/detect-object-injection -- provider is validated against a fixed allowlist
  const socialType = PROVIDER_TO_SOCIAL_TYPE[provider];
  if (!socialType) return null;

  const providerId = extractProviderId(user);
  return providerId ? { providerId: String(providerId), socialType } : null;
}

interface LegacyProfile {
  id: string;
  username: string;
  nickname: string | null;
  social_id: string | null;
  type_social: string | null;
  profile_image_path: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic table/column access
type AnyClient = any;

async function moveFkReferences(client: AnyClient, legacyId: string, newId: string): Promise<void> {
  for (const { table, column } of FK_TABLES) {
    await client.from(table).update({ [column]: newId }).eq(column, legacyId);
  }
  await client.from("post_views").update({ user_id: newId }).eq("user_id", legacyId);
}

async function findLegacyProfile(
  client: AnyClient,
  providerId: string,
  socialType: string,
  currentUserId: string,
): Promise<LegacyProfile | null> {
  const { data } = await client
    .from("profiles")
    .select("id, username, nickname, social_id, type_social, profile_image_path")
    .eq("social_id", providerId)
    .eq("type_social", socialType)
    .neq("id", currentUserId)
    .single();
  return (data as LegacyProfile) ?? null;
}

export async function migrateLegacySocialProfile(
  adminClient: SupabaseClient<Database>,
  user: User,
): Promise<void> {
  const providerInfo = getProviderInfo(user);
  if (!providerInfo) return;

  const legacy = await findLegacyProfile(adminClient, providerInfo.providerId, providerInfo.socialType, user.id);
  if (!legacy) return;

  // eslint-disable-next-line no-console
  console.log(`[Legacy Migration] Migrating ${legacy.username} (${legacy.id}) → ${user.id}`);

  // Move all FK references, then delete legacy profile (frees username unique constraint), then update new profile
  await moveFkReferences(adminClient, legacy.id, user.id);
  await adminClient.from("profiles").delete().eq("id", legacy.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile_image_path not in generated types
  await (adminClient as any).from("profiles").update({
    username: legacy.username,
    nickname: legacy.nickname ?? user.user_metadata?.name ?? legacy.username,
    social_id: legacy.social_id,
    type_social: legacy.type_social,
    profile_image_path: legacy.profile_image_path,
  }).eq("id", user.id);

  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, username: legacy.username, nickname: legacy.nickname, legacy_migrated: true },
  });

  // eslint-disable-next-line no-console
  console.log(`[Legacy Migration] Success: ${legacy.username} migrated to ${user.id}`);
}
