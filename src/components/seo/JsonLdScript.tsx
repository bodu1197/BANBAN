// Server Component — JSON-LD 안전 직렬화 후 <script type="application/ld+json"> 으로 임베드.
// jsonLdSafe 가 `</script>` 조기 종료 XSS 차단을 위해 `<` 를 escape 함.
import { jsonLdSafe } from "@/lib/seo";

export function JsonLdScript({ jsonLd }: Readonly<{ jsonLd: Record<string, unknown> }>): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
    />
  );
}
