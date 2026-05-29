import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import {
  fetchLocationSeoList,
  type LocationSeoListItem,
} from "@/lib/location-seo/queries";
import { buildPageSeo } from "@/lib/seo";

const LIST_TITLE = "지역별 반영구 가이드";
const LIST_DESCRIPTION =
  "지역·시술별 반영구 정보 — 활동 샵 수, 등록 작품, 가격 정보를 한눈에. 내 지역의 반영구 잘하는 곳을 찾아보세요.";

export function generateLocationListMetadata(): Metadata {
  return {
    title: LIST_TITLE,
    description: LIST_DESCRIPTION,
    ...buildPageSeo({ title: LIST_TITLE, description: LIST_DESCRIPTION, path: "/location" }),
  };
}

function LocationCard({
  item,
}: Readonly<{ item: LocationSeoListItem }>): React.ReactElement {
  return (
    <li>
      <Link
        href={`/location/${item.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[16/9] w-full bg-muted">
          {item.cover_image_url ? (
            <Image
              src={item.cover_image_url}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 341px"
              unoptimized
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {item.region_name}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {item.style}
            </span>
          </div>
          <h2 className="mb-1 text-base font-bold leading-snug text-foreground">
            {item.title}
          </h2>
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            반언니 등록 샵 {item.artist_count.toLocaleString()}곳 · 작품{" "}
            {item.portfolio_count.toLocaleString()}개
          </p>
        </div>
      </Link>
    </li>
  );
}

export async function renderLocationListPage(): Promise<React.ReactElement> {
  const { items } = await fetchLocationSeoList({ limit: 60 });

  return (
    <main className="mx-auto w-full max-w-[1024px] px-4 py-6">
      <h1 className="mb-2 text-xl font-bold md:text-2xl">{LIST_TITLE}</h1>
      <p className="mb-6 text-sm text-muted-foreground md:text-[15px]">{LIST_DESCRIPTION}</p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          준비 중입니다. 곧 지역별 반영구 가이드가 추가됩니다.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <LocationCard key={item.slug} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
