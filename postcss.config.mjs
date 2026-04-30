/**
 * PostCSS configuration.
 *
 * Tailwind v4 의 @property + @supports 폴리필 제거 플러그인 포함.
 *
 * browserslist (Chrome 100+, Safari 15.4+, Firefox 100+) 타깃 브라우저 중
 * Chrome 100-110 / Firefox 100-112 는 oklch / color-mix 미지원이지만,
 * @supports 블록을 unwrap(내용 유지, 래퍼 제거) 하므로 폴백 값 자체는
 * 모든 브라우저에 적용됨 → 안전.
 *
 * 빌드 시 CSS 170KB → 145KB (-25KB, -15%), gzip 전송 크기 ~3.7KB 절감.
 * Style & Layout 462ms 중 @supports 평가 비용 제거 → 추정 30-50ms 감소.
 */

// @property 규칙 제거 — Chrome 100+/Safari 15.4+/Firefox 100+ 가
// @property 를 지원하므로 등록 없이도 CSS custom property 동작.
const removePropertyRules = () => ({
  postcssPlugin: "remove-property-rules",
  AtRule: {
    property(rule) {
      rule.remove();
    },
  },
});
removePropertyRules.postcss = true;

// Tailwind v4 @supports 폴리필 블록 unwrap (하위 규칙 유지, 래퍼만 제거).
// - hyphens:none 패턴: @property 미지원 브라우저 fallback
// - color-mix/lab 패턴: oklch 미지원 브라우저 색상 fallback
// - -apple-pay-button 패턴: Safari 구버전 감지
const unwrapSupportsFallbacks = () => ({
  postcssPlugin: "unwrap-supports-fallbacks",
  AtRule: {
    supports(rule) {
      const p = rule.params;
      if (
        p.includes("hyphens") ||
        p.includes("color-mix") ||
        p.includes("color:lab") ||
        p.includes("-apple-pay-button")
      ) {
        rule.replaceWith(rule.nodes);
      }
    },
  },
});
unwrapSupportsFallbacks.postcss = true;

const config = {
  plugins: [
    "@tailwindcss/postcss",
    removePropertyRules,
    unwrapSupportsFallbacks,
  ],
};

export default config;
