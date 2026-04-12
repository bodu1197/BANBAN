// @client-reason: chat modal state, kakao/phone actions
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
// 1:1 채팅 — 당분간 비활성화
// import { MessageCircle } from "lucide-react";
// const InlineChat = dynamic(
//   () => import("@/components/chat/InlineChat").then((m) => ({ default: m.InlineChat })),
//   { ssr: false }
// );
import { useAuth } from "@/hooks/useAuth";

const BASE_BTN = "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ICON_BTN = `${BASE_BTN} bg-background hover:bg-muted`;
const KAKAO_BTN = `${BASE_BTN} border-transparent bg-brand-kakao text-brand-kakao-foreground hover:brightness-95 focus-visible:brightness-95`;

interface FloatingCTAProps {
  kakaoUrl: string | null;
  contact: string | null;
  artistUserId: string;
  artistName: string;
  chatLabel?: string;
  artistId: string;
}

function trackContactClick(artistId: string, clickType: "kakao" | "phone"): void {
  void fetch("/api/contact-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, clickType, sourcePage: "artist", sourceId: artistId }),
    keepalive: true,
  });
}

function KakaoIcon(): React.ReactElement {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.58-.15.55-.58 2.07-.66 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.9.13 1.83.2 2.79.2 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
    </svg>
  );
}

function CTAButtons({ kakaoUrl, contact, chatLabel: _chatLabel, onChat: _onChat, artistId }: Readonly<{
  kakaoUrl: string | null;
  contact: string | null;
  chatLabel: string;
  onChat: () => void;
  artistId: string;
}>): React.ReactElement {
  return (
    <div className="mx-auto flex max-w-[767px] items-center gap-1.5 p-2">
      {/* 1:1 채팅 — 당분간 비활성화
      <button
        type="button"
        onClick={onChat}
        className={`${ICON_BTN} text-foreground`}
        aria-label={chatLabel}
      >
        <MessageCircle className="h-4 w-4" />
        {chatLabel}
      </button>
      */}
      {kakaoUrl ? (
        <a href={kakaoUrl} target="_blank" rel="noopener noreferrer" className={KAKAO_BTN} aria-label="카카오톡" onClick={() => trackContactClick(artistId, "kakao")}>
          <KakaoIcon />
          카카오톡
        </a>
      ) : null}
      {contact ? (
        <a href={`tel:${contact}`} className={`${ICON_BTN} text-foreground`} aria-label="전화" onClick={() => trackContactClick(artistId, "phone")}>
          <Phone className="h-4 w-4" />
          전화
        </a>
      ) : null}
    </div>
  );
}

export function FloatingCTA({
  kakaoUrl,
  contact,
  artistUserId: _artistUserId,
  artistName: _artistName,
  chatLabel = "채팅",
  artistId: _artistId,
}: Readonly<FloatingCTAProps>): React.ReactElement {
  // 1:1 채팅 — 당분간 비활성화
  const [_chatOpen, _setChatOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleChat = (): void => {
    if (user) _setChatOpen(true);
    else router.push("/login");
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background">
        <CTAButtons kakaoUrl={kakaoUrl} contact={contact} chatLabel={chatLabel} onChat={handleChat} artistId={_artistId} />
      </div>
      {/* 1:1 채팅 — 당분간 비활성화
      {user ? (
        <InlineChat
          otherUserId={artistUserId}
          otherName={artistName}
          currentUserId={user.id}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
      */}
    </>
  );
}
