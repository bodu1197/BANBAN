// @client-reason: Uses browser APIs for Daum Postcode
"use client";

import { useCallback, useState } from "react";

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

interface DaumPostcode {
  embed: (container: HTMLElement) => void;
  open: () => void;
}

interface DaumPostcodeConstructor {
  new (options: {
    oncomplete: (data: DaumPostcodeData) => void;
    onclose?: () => void;
    width: string;
    height: string;
    maxSuggestItems?: number;
  }): DaumPostcode;
}

interface DaumNamespace {
  Postcode: DaumPostcodeConstructor;
}

// Typed accessor for the daum global (loaded via external script)
function getDaum(): DaumNamespace | undefined {
  return (globalThis as unknown as { daum?: DaumNamespace }).daum;
}

export function useDaumPostcode(): UseDaumPostcodeReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(async (): Promise<DaumPostcodeData | null> => {
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
      setIsOpen(false);
      return null;
    }

    return new Promise((resolve) => {
      new daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          setIsOpen(false);
          resolve(data);
        },
        onclose: () => {
          setIsOpen(false);
          resolve(null);
        },
        width: "100%",
        height: "100%",
        maxSuggestItems: 5,
      }).embed(container);
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    open,
    close,
  };
}
