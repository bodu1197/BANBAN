// @client-reason: navigator.clipboard + window.open은 브라우저 API
"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

const COPY_FEEDBACK_MS = 2000;

interface AddressActionsProps {
  address: string;
}

export function AddressActions({ address }: Readonly<AddressActionsProps>): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [address]);

  const handleMap = useCallback(() => {
    const url = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
    globalThis.open(url, "_blank", "noopener");
  }, [address]);

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={handleCopy}
        aria-label={copied ? "주소 복사 완료" : "주소 복사"}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" aria-hidden />
        ) : (
          <Copy className="h-3 w-3" aria-hidden />
        )}
        {copied ? "복사됨" : "주소 복사"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={handleMap}
        aria-label="네이버 지도에서 보기"
      >
        <Navigation className="h-3 w-3" aria-hidden />
        지도 보기
      </Button>
    </div>
  );
}
