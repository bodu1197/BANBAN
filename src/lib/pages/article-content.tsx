import Image from "next/image";

/** 백과/지역 SEO 공용 — 마크다운 본문 + FAQ 렌더러(board/location 공유, 중복 방지). */

export interface FaqItem {
  question: string;
  answer: string;
}

interface ParsedNode {
  type: "h2" | "h3" | "p" | "img" | "br";
  text?: string;
  src?: string;
  alt?: string;
}

function parseMarkdown(content: string): ParsedNode[] {
  const lines = content.split("\n");
  const out: ParsedNode[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      out.push({ type: "br" });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      out.push({ type: "h2", text: trimmed.replace(/^##\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      out.push({ type: "h3", text: trimmed.replace(/^###\s+/, "") });
      continue;
    }
    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imgMatch) {
      out.push({ type: "img", alt: imgMatch[1], src: imgMatch[2] });
      continue;
    }
    out.push({ type: "p", text: trimmed });
  }
  return out;
}

export function WatermarkStamp(): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-bold tracking-tight text-white shadow-sm backdrop-blur-sm md:text-xs"
    >
      반언니
    </span>
  );
}

function MarkdownImage({
  src,
  alt,
}: Readonly<{ src: string; alt?: string }>): React.ReactElement {
  return (
    <figure className="my-5 overflow-hidden rounded-lg">
      <div className="relative aspect-[4/3] w-full bg-muted">
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          className="object-cover"
          sizes="(max-width: 767px) 100vw, 767px"
          unoptimized
        />
        <WatermarkStamp />
      </div>
      {alt ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderNode(node: ParsedNode, key: string): React.ReactElement {
  if (node.type === "h2") {
    return (
      <h2 key={key} className="mb-2 mt-6 text-base font-bold md:text-lg">
        {node.text}
      </h2>
    );
  }
  if (node.type === "h3") {
    return (
      <h3 key={key} className="mb-2 mt-4 text-sm font-bold md:text-base">
        {node.text}
      </h3>
    );
  }
  if (node.type === "img" && node.src) {
    return <MarkdownImage key={key} src={node.src} alt={node.alt} />;
  }
  if (node.type === "br") {
    return <div key={key} className="h-2" />;
  }
  return (
    <p key={key} className="mb-3 text-sm leading-relaxed md:text-[15px]">
      {node.text}
    </p>
  );
}

export function ArticleBody({
  content,
  coverImageUrl,
}: Readonly<{ content: string; coverImageUrl?: string | null }>): React.ReactElement {
  const nodes = parseMarkdown(content);
  // 커버 이미지가 본문 첫 이미지로 중복 노출되는 것 방지(상단 히어로로 이미 렌더).
  const coverIdx = coverImageUrl
    ? nodes.findIndex((n) => n.type === "img" && n.src === coverImageUrl)
    : -1;
  const filtered = coverIdx >= 0 ? nodes.filter((_, i) => i !== coverIdx) : nodes;

  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
      {filtered.map((node, i) => renderNode(node, `node-${i}`))}
    </div>
  );
}

export function FaqSection({
  faq,
}: Readonly<{ faq: ReadonlyArray<FaqItem> | null | undefined }>): React.ReactElement | null {
  if (!faq || faq.length === 0) return null;
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="mb-4 text-base font-bold md:text-lg">자주 묻는 질문</h2>
      <div className="space-y-2">
        {faq.map((item, i) => (
          <details key={`faq-${String(i)}`} className="group rounded-lg border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground motion-safe:transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50 md:text-[15px]">
              {item.question}
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
