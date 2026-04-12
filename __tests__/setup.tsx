import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React from "react";

// 각 테스트 후 자동 정리
afterEach(() => {
  cleanup();
});

// Next.js Link 모킹
vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return React.createElement("a", { href, ...props }, children);
  },
}));

// Next.js 라우터 모킹
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/ko",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ }),
}));

// Next.js Image 모킹
vi.mock("next/image", () => ({
  default: function MockImage({
    src,
    alt,
    fill,
    priority,
    sizes,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    [key: string]: unknown;
  }) {
    return React.createElement("img", {
      src,
      alt,
      "data-fill": fill ? "true" : undefined,
      "data-priority": priority ? "true" : undefined,
      "data-sizes": sizes,
      ...props,
    });
  },
}));

// window.matchMedia 모킹 (반응형 테스트용)
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// PointerEvent 모킹 (Radix UI용)
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.button = props.button ?? 0;
    this.ctrlKey = props.ctrlKey ?? false;
    this.pointerType = props.pointerType ?? "mouse";
  }
}
globalThis.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;

// hasPointerCapture 모킹 (Radix UI Select용)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}

// scrollIntoView 모킹
Element.prototype.scrollIntoView = vi.fn();

// ResizeObserver 모킹
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserver 모킹
globalThis.IntersectionObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Geolocation API 모킹
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};
Object.defineProperty(navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
  configurable: true,
});

export { mockGeolocation };
