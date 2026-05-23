// @client-reason: trackContactClick requires DOM event handlers
"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { THEME_BTN, KAKAO_BTN, PRIMARY_BTN } from "@/components/ui/cta-button-styles";
import { KakaoIcon } from "@/components/ui/KakaoIcon";
import { isSafeUrl, isSafePhone, trackContactClick } from "@/lib/contact-utils";

interface ContactBottomBarProps {
  kakaoUrl?: string | null;
  contact?: string | null;
  artistId: string;
  sourceType: "portfolio" | "event" | "artist" | "course";
  sourceId: string;
  onShopInfoClick?: () => void;
}

export function ContactBottomBar({
  kakaoUrl,
  contact,
  artistId,
  sourceType,
  sourceId,
  onShopInfoClick,
}: Readonly<ContactBottomBarProps>): React.ReactElement {
  const safeKakao = kakaoUrl && isSafeUrl(kakaoUrl) ? kakaoUrl : null;
  const safeContact = contact && isSafePhone(contact) ? contact : null;

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[1024px] -translate-x-1/2 border-t bg-background p-2">
      <div className="flex items-center gap-1.5">
        {onShopInfoClick ? (
          <button type="button" onClick={onShopInfoClick} className={THEME_BTN} aria-label="샵 정보 보기">
            샵 정보
          </button>
        ) : null}
        {safeKakao ? (
          <a href={safeKakao} target="_blank" rel="noopener noreferrer" className={KAKAO_BTN} aria-label="카카오톡 상담" onClick={() => trackContactClick(artistId, "kakao", sourceType, sourceId)}>
            <KakaoIcon />
            카톡상담
          </a>
        ) : null}
        {safeContact ? (
          <a href={`tel:${safeContact}`} className={PRIMARY_BTN} aria-label="전화 상담" onClick={() => trackContactClick(artistId, "phone", sourceType, sourceId)}>
            <Phone className="h-4 w-4" />
            상담 신청
          </a>
        ) : (
          <Link href={`/artists/${artistId}`} className={PRIMARY_BTN}>상담 신청</Link>
        )}
      </div>
    </div>
  );
}
