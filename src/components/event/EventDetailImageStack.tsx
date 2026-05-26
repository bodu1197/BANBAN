import Image from "next/image";
import {
  DETAIL_SECTION_TYPES,
  DETAIL_SECTION_LABELS,
  type DetailSectionType,
} from "@/components/event-form/types";

interface DetailSection {
  id: string;
  storage_path: string;
  media_type: string;
  order_index: number | null;
  alt_text?: string | null;
}

function getSectionLabel(mediaType: string): string {
  if (DETAIL_SECTION_TYPES.includes(mediaType as DetailSectionType)) {
    return DETAIL_SECTION_LABELS[mediaType as DetailSectionType];
  }
  return "이벤트 상세";
}

export function EventDetailImageStack({
  sections,
}: Readonly<{ sections: DetailSection[] }>): React.ReactElement {
  const sorted = [...sections].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div>
      {sorted.map((section, i) => {
        const label = section.alt_text || getSectionLabel(section.media_type);
        return (
          <figure key={section.id} className="relative w-full">
            <Image
              src={section.storage_path}
              alt={label}
              width={1024}
              height={1536}
              className="h-auto w-full"
              sizes="(max-width: 768px) 100vw, 768px"
              loading={i === 0 ? "eager" : "lazy"}
              preload={i === 0}
              quality={85}
            />
            <figcaption className="sr-only">{label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
