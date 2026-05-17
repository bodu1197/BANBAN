// @client-reason: autoFocus input + 라우터 push + URL state 필요
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import type { HomeArtist } from "@/lib/supabase/home-artist-queries";

interface Props {
  popularArtists: ReadonlyArray<HomeArtist>;
}

const POPULAR_KEYWORDS: ReadonlyArray<string> = STRINGS.globalSearch.popularKeywordsList;

function PopularKeywordChips({ onSelect }: Readonly<{ onSelect: (q: string) => void }>): React.ReactElement {
  // 부모 <section> 이 이미 aria-labelledby="popular-keywords-heading" 로 라벨링됨 — ul 에 중복 aria-label 금지
  return (
    <ul className="flex flex-wrap gap-2">
      {POPULAR_KEYWORDS.map((kw) => (
        <li key={kw}>
          <button
            type="button"
            onClick={() => onSelect(kw)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:border-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {kw}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PopularArtistCard({ artist, rank }: Readonly<{ artist: HomeArtist; rank: number }>): React.ReactElement {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden="true" className="w-6 shrink-0 text-center text-sm font-bold text-brand-primary">{rank}</span>
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {artist.profileImage ? (
          <Image src={artist.profileImage} alt={artist.title} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">
            {artist.title.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{artist.title}</p>
        {artist.regionName ? (
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {artist.regionName}
          </span>
        ) : null}
      </div>
      {artist.likesCount > 0 ? (
        <span className="shrink-0 text-xs text-muted-foreground">♥ {artist.likesCount.toLocaleString()}</span>
      ) : null}
    </Link>
  );
}

function PopularArtistList({ artists }: Readonly<{ artists: ReadonlyArray<HomeArtist> }>): React.ReactElement {
  if (artists.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">인기 아티스트 데이터가 없습니다.</p>;
  }
  return (
    <ol className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {artists.map((a, i) => (
        <li key={a.id}>
          <PopularArtistCard artist={a} rank={i + 1} />
        </li>
      ))}
    </ol>
  );
}

function SearchHeader({ value, onChange, onSubmit, onBack, inputRef }: Readonly<{
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={STRINGS.globalSearch.back}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex flex-1 items-center gap-2 rounded-full border-2 border-brand-primary/40 bg-background px-4 h-12 transition-colors focus-within:border-brand-primary"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={STRINGS.globalSearch.explorePlaceholder}
          aria-label={STRINGS.globalSearch.explorePlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

export function SearchExplore({ popularArtists }: Readonly<Props>): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    // 진입 시 input autoFocus — 바비톡 패턴 (모바일 키보드 자동 노출)
    inputRef.current?.focus();
  }, []);

  const submitQuery = (q: string): void => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="space-y-6">
      <SearchHeader
        value={value}
        onChange={setValue}
        onSubmit={() => submitQuery(value)}
        onBack={() => router.back()}
        inputRef={inputRef}
      />
      <section aria-labelledby="popular-keywords-heading" className="space-y-3">
        <h2 id="popular-keywords-heading" className="text-base font-bold">{STRINGS.globalSearch.popularKeywords}</h2>
        <PopularKeywordChips onSelect={submitQuery} />
      </section>
      <section aria-labelledby="popular-artists-heading" className="space-y-3">
        <h2 id="popular-artists-heading" className="text-base font-bold">{STRINGS.globalSearch.popularArtists}</h2>
        <PopularArtistList artists={popularArtists} />
      </section>
    </div>
  );
}
