/* eslint-disable no-console -- server-side logging for indexing diagnostics */
import "server-only";
import { JWT } from "google-auth-library";
import { PUBLIC_ENV, SERVER_ENV } from "@/lib/config/env";

const INDEXING_ENDPOINT =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

export type IndexingType = "URL_UPDATED" | "URL_DELETED";

interface ServiceCredentials {
  client_email: string;
  private_key: string;
}

let cachedClient: JWT | null = null;

function parseCredentials(): ServiceCredentials | null {
  const raw = SERVER_ENV.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" || parsed === null ||
      typeof (parsed as Record<string, unknown>).client_email !== "string" ||
      typeof (parsed as Record<string, unknown>).private_key !== "string"
    ) {
      console.error("[Indexing API] GOOGLE_SERVICE_ACCOUNT_JSON missing required fields");
      return null;
    }
    return parsed as ServiceCredentials;
  } catch {
    console.error("[Indexing API] Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON");
    return null;
  }
}

function getJWTClient(): JWT | null {
  if (cachedClient) return cachedClient;
  const creds = parseCredentials();
  if (!creds) return null;
  cachedClient = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  return cachedClient;
}

export async function notifyGoogleIndex(
  urlPath: string,
  type: IndexingType = "URL_UPDATED",
): Promise<boolean> {
  try {
    const client = getJWTClient();
    if (!client) return false;

    const res = await client.getAccessToken();
    if (!res.token) return false;

    const base = PUBLIC_ENV.SITE_URL.replace(/\/$/, "");
    const path = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;

    const response = await fetch(INDEXING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${res.token}`,
      },
      body: JSON.stringify({ url: `${base}${path}`, type }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "[unreadable]");
      console.error(`[Indexing API] ${response.status} for ${path}:`, err.slice(0, 300));
      return false;
    }

    console.log(`[Indexing API] ${type} → ${path}`);
    return true;
  } catch (error) {
    console.error("[Indexing API] Error:", error instanceof Error ? error.message : "unknown");
    return false;
  }
}
