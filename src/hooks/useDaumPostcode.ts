// @client-reason: Uses browser APIs for Daum Postcode
"use client";

import { useCallback, useRef, useState } from "react";

interface DaumPostcodeData {
  address: string;
  addressEnglish: string;
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
}

interface UseDaumPostcodeReturn {
  isOpen: boolean;
  open: () => Promise<DaumPostcodeData | null>;
  close: () => void;
}

// Daum Postcode 타입은 globals.d.ts 의 Window.daum ambient 선언 사용.
function getDaum(): Window["daum"] {
  return typeof globalThis !== "undefined"
    ? (globalThis as unknown as Window).daum
    : undefined;
}

export function useDaumPostcode(): UseDaumPostcodeReturn {
  const [isOpen, setIsOpen] = useState(false);
  /** 모달을 연 요소 — 닫히면 포커스를 돌려준다(안 그러면 키보드·스크린리더 사용자가 문서 맨 앞으로 튕긴다). */
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    // 한 번만 돌려준다 — 선택하면 oncomplete 뒤 onclose 가 또 오고, ×로 닫은 뒤 늦게 끝난 open() 도 close 를 부른다
    // (그때 포커스를 다시 끌어오면 상세주소를 입력하던 칸이 blur 된다).
    const opener = openerRef.current;
    openerRef.current = null;
    opener?.focus();
  }, []);

  const open = useCallback(async (): Promise<DaumPostcodeData | null> => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);

    // Load Daum Postcode script if not loaded
    if (!getDaum()?.Postcode) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Daum Postcode script"));
        document.head.appendChild(script);
      });
    }

    // Wait for container to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    const container = document.getElementById("daumPostcodeContainer");
    const daum = getDaum();
    if (!container || !daum?.Postcode) {
      close();
      return null;
    }

    return new Promise((resolve) => {
      new daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          close();
          resolve(data);
        },
        onclose: () => {
          close();
          resolve(null);
        },
        width: "100%",
        height: "100%",
        maxSuggestItems: 5,
      }).embed(container);
    });
  }, [close]);

  return {
    isOpen,
    open,
    close,
  };
}
