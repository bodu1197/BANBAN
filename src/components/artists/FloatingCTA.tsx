// @client-reason: kakao/phone CTA actions
"use client";

import { Phone } from "lucide-react";
import { KAKAO_BTN } from "@/components/ui/cta-button-styles";
import { KakaoIcon } from "@/components/ui/KakaoIcon";
import { isSafeUrl, isSafePhone, trackContactClick } from "@/lib/contact-utils";

const BASE_BTN = "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ICON_BTN = `${BASE_BTN} bg-background hover:bg-muted`;

interface FloatingCTAProps {
  kakaoUrl: string | null;
  contact: string | null;
  artistId: string;
}

export function FloatingCTA({
  kakaoUrl,
  contact,
  artistId,
}: Readonly<FloatingCTAProps>): React.ReactElement {
  const safeKakao = kakaoUrl && isSafeUrl(kakaoUrl) ? kakaoUrl : null;
  const safeContact = contact && isSafePhone(contact) ? contact : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background">
      <div className="mx-auto flex max-w-[767px] items-center gap-1.5 p-2">
        {safeKakao ? (
          <a href={safeKakao} target="_blank" rel="noopener noreferrer" className={KAKAO_BTN} aria-label="카카오톡 상담" onClick={() => trackContactClick(artistId, "kakao", "artist", artistId)}>
            <KakaoIcon />
            카카오톡
          </a>
        ) : null}
        {safeContact ? (
          <a href={`tel:${safeContact}`} className={`${ICON_BTN} text-foreground`} aria-label="전화 상담" onClick={() => trackContactClick(artistId, "phone", "artist", artistId)}>
            <Phone className="h-4 w-4" />
            전화
          </a>
        ) : null}
      </div>
    </div>
  );
}
