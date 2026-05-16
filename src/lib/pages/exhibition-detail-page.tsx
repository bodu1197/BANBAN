import type { Metadata } from "next";
import Image from "next/image";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo, getBreadcrumbJsonLd, getEventJsonLd, getCanonicalUrl, jsonLdSafe } from "@/lib/seo";
import {
  fetchExhibitionById,
  fetchExhibitionEntries,
  fetchArtistEntriesForExhibition,
  type ExhibitionDetail,
  type ArtistEntry,
} from "@/lib/supabase/exhibition-entry-queries";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ExhibitionDetailClient } from "@/components/exhibition/ExhibitionDetailClient";

interface ArtistRow { id: string }

export async function generateExhibitionDetailMetadata(id: string): Promise<Metadata> {
  const exhibition = await fetchExhibitionById(id);
  const title = exhibition?.title ?? STRINGS.pages.exhibition;
  const description = exhibition?.subtitle ?? STRINGS.pages.exhibitionDesc;
  const bannerImage = exhibition?.image_path ? getStorageUrl(exhibition.image_path) : null;
  return {
    title,
    description,
    ...buildPageSeo({
      title,
      description,
      path: `/exhibition/${id}`,
      image: bannerImage,
    }),
  };
}

async function getArtistContext(exhibitionId: string): Promise<{
  artistId: string | null;
  artistEntries: ArtistEntry[];
}> {
  const user = await getUser();
  if (!user) return { artistId: null, artistEntries: [] };

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists").select("id")
    .eq("user_id", user.id).is("deleted_at", null)
    .maybeSingle() as { data: ArtistRow | null };

  if (!artist) return { artistId: null, artistEntries: [] };
  const entries = await fetchArtistEntriesForExhibition(artist.id, exhibitionId);
  return { artistId: artist.id, artistEntries: entries };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul",
  });
}

function ExhibitionBanner({
  exhibition,
}: Readonly<{ exhibition: ExhibitionDetail }>): React.ReactElement {
  const bannerUrl = getStorageUrl(exhibition.image_path);
  return (
    <section className="relative h-[200px] w-full overflow-hidden md:h-[280px] lg:h-[320px]">
      {bannerUrl ? (
        <Image src={bannerUrl} alt={exhibition.title} fill
          sizes="(max-width: 767px) 100vw, 767px" className="object-cover" priority />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
        <h1 className="text-xl font-extrabold text-white drop-shadow-lg md:text-2xl lg:text-3xl">
          {exhibition.title}
        </h1>
        {exhibition.subtitle ? (
          <p className="mt-1 text-sm text-white/80 drop-shadow md:text-base">{exhibition.subtitle}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
          {exhibition.start_at || exhibition.end_at ? (
            <span>{formatDate(exhibition.start_at)} ~ {formatDate(exhibition.end_at)}</span>
          ) : null}
          <span>{STRINGS.exhibition.entryCount} {exhibition.entry_count}{STRINGS.exhibition.portfolioCount}</span>
        </div>
      </div>
    </section>
  );
}

export async function renderExhibitionDetailPage(id: string): Promise<React.ReactElement> {
  const [exhibition, entries] = await Promise.all([
    fetchExhibitionById(id), fetchExhibitionEntries(id),
  ]);

  if (!exhibition) {
    return (
      <main className="mx-auto flex w-full max-w-[767px] items-center justify-center px-4 py-20">
        <p className="text-muted-foreground">{STRINGS.error.notFound}</p>
      </main>
    );
  }

  const { artistId, artistEntries } = await getArtistContext(id);
  const now = new Date();
  const isEnded = exhibition.end_at ? new Date(exhibition.end_at) < now : false;
  const isActive = exhibition.is_active && !isEnded;

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "" },
    { name: "기획전", path: "/exhibition" },
    { name: exhibition.title, path: `/exhibition/${id}` },
  ]);

  const bannerUrl = getStorageUrl(exhibition.image_path);
  const eventJsonLd = exhibition.start_at
    ? getEventJsonLd({
        name: exhibition.title,
        description: exhibition.subtitle ?? "",
        startDate: exhibition.start_at,
        endDate: exhibition.end_at,
        url: getCanonicalUrl(`/exhibition/${id}`),
        image: bannerUrl,
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-[767px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }}
      />
      {eventJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(eventJsonLd) }}
        />
      ) : null}
      <ExhibitionBanner exhibition={exhibition} />
      <ExhibitionDetailClient
        exhibitionId={id} entries={entries} artistId={artistId}
        artistEntries={artistEntries} isActive={isActive}
      />
    </main>
  );
}
